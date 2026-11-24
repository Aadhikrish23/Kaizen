"""One chat message, start to finish:

    pending yes/no -> undo -> greeting/help -> fast path (no model) -> model plan -> grounding (the user's own words)
    -> confirmation for risky changes -> run the actions through the Express API -> reply from what actually happened.

The reply to a change is always built from the real results of the actions, never from model text, so the assistant cannot claim to
have done something it did not do.
"""
import re
from typing import Any, Dict, List, Optional

from ..core.kaizen_api import ApiError, KaizenApi
from ..services.coach_service import coach_service
from ..services.llm import LLMProvider
from ..services.recommendations import get_meal_recommendations
from ..services.user_context import load_profile, metrics_context, profile_context
from .fastpath import fast_path
from .grounding import ground
from .models import INTENTS, Intent, ToolResult, UndoOp
from .planner import plan_with_model
from .store import Pending, Session, UndoSnapshot, sessions
from .text import GREETING_RE, HELP_RE, NO_RE, UNDO_RE, YES_RE, days_ago_from, has_command_cue, is_question_only
from .tools import EXECUTORS, ToolContext, make_context, needs_confirmation, run_undo

HELP_TEXT = (
    "I can log things and answer questions about your data. Try:\n"
    "- \"ate 2 rotis and dal for lunch\", \"had a glass of water\", \"I weigh 71.2 kg\", \"slept 11pm to 7am\"\n"
    "- \"bench press 3 sets of 10 at 60kg\", \"start today's workout\", \"make me a 4 day upper lower plan\"\n"
    "- \"set my protein target to 160g\" (I'll ask you to confirm first)\n"
    "- \"how many calories do I have left?\", \"what should I eat tonight?\"\n"
    "- \"undo\" takes back my last change. Add \"yesterday\" to log for yesterday."
)
GREETING_TEXT = "Hi! I'm your Kaizen coach. Tell me what you ate, drank, lifted or how you slept and I'll log it, or ask me anything about your training and nutrition. Say \"help\" for examples."


def _intent_names(intents: List[Intent]) -> List[Dict[str, Any]]:
    return [{"type": i.type} for i in intents]


class Reply(dict):
    """The payload returned to the caller (camelCase to match the rest of the API)."""


def _reply(text: str, status: str = "SUCCESS", *, source: str = "rules", model: Optional[str] = None, changed: Optional[List[str]] = None,
           actions: Optional[List[Dict[str, Any]]] = None, session: Optional[Session] = None, message: str = "") -> Reply:
    if session is not None and message:
        session.exchanges.append((message[:1000], text[:1000]))
    return Reply(
        reply=text, status=status, source=source, modelUsed=model or ("rules" if source == "rules" else "heuristic-coach"),
        contextApplied=True, changed=sorted(set(changed or [])), actions=actions or [],
        undoAvailable=bool(session and session.undo and not session.undo.expired()),
        confirmationRequired=status == "CONFIRMATION_REQUIRED",
    )


async def chat(api: KaizenApi, provider: LLMProvider, message: str, request_id: str) -> Reply:
    message = " ".join(message.split())
    user = await load_profile(api)  # also proves the token is valid before anything else happens
    user_id = str(user.get("_id") or user.get("id"))
    session = sessions.get(user_id)
    async with session.lock:  # one message at a time per user: a double-click cannot interleave two plans
        return await _chat_locked(api, provider, user, session, message, request_id)


async def _chat_locked(api: KaizenApi, provider: LLMProvider, user: Dict[str, Any], session: Session, message: str, request_id: str) -> Reply:
    days_ago = days_ago_from(message)
    ctx = make_context(api, user, request_id, days_ago)
    imperial = user.get("units") == "imperial"

    # 1. An offer we asked about last turn.
    pending = session.take_pending()
    if pending and YES_RE.match(message):
        return await _execute(ctx, session, pending.intents, pending.message, [], source="rules", model=None, days_ago=pending.days_ago)
    if pending and NO_RE.match(message):
        return _reply("Okay, I won't change anything.", "CANCELLED", session=session, message=message)
    if not pending and (YES_RE.match(message) or NO_RE.match(message)):
        return _reply("Okay. Tell me what you'd like to log or change, or say \"help\" for examples.", session=session, message=message)

    # 2. Undo, greetings and help need no model.
    if UNDO_RE.match(message):
        return await _undo(api, session, message)
    if HELP_RE.match(message):
        return _reply(HELP_TEXT, session=session, message=message)
    if GREETING_RE.match(message):
        return _reply(GREETING_TEXT, session=session, message=message)

    # 3. Plain commands and data questions, answered from the data.
    fast = await fast_path(message, ctx, imperial)
    intents: Optional[List[Intent]] = None
    source, model = "rules", None
    if fast and fast.answer:
        return _reply(fast.answer, session=session, message=message)
    if fast and fast.intents:
        intents = fast.intents
    else:
        # 4. Anything else: ask the model what the message wants.
        intents, model, _invalid = await plan_with_model(provider, message, ctx.today, ctx.tz, session.history())
        source = "llm"
        if intents is None:
            return await _without_model(ctx, session, message)

    # 5. Hold the plan to the user's own words.
    intents, notes = ground(intents, message, imperial)
    writes = [i for i in intents if i.writes]
    reads = [i for i in intents if not i.writes]

    if writes:
        question = await _first_confirmation(ctx, writes)
        if question:
            session.pending = Pending(writes, question, message, days_ago)
            return _reply(" ".join([*notes, question]), "CONFIRMATION_REQUIRED", source=source, model=model, session=session, message=message)
        return await _execute(ctx, session, writes, message, notes, source=source, model=model, days_ago=days_ago, reads=reads)

    return await _answer_reads(ctx, session, message, reads, notes, source, model)


async def _first_confirmation(ctx: ToolContext, writes: List[Intent]) -> Optional[str]:
    for intent in writes:
        question = await needs_confirmation(ctx, intent)
        if question:
            return question
    return None


async def _execute(ctx: ToolContext, session: Session, intents: List[Intent], message: str, notes: List[str], *, source: str,
                   model: Optional[str], days_ago: int, reads: Optional[List[Intent]] = None) -> Reply:
    ctx.days_ago = days_ago
    results: List[ToolResult] = []
    for intent in intents:
        results.append(await EXECUTORS[intent.type](ctx, intent.params))

    ok = [r for r in results if r.ok]
    undo_ops: List[UndoOp] = [op for r in ok for op in r.undo]
    changed = [c for r in ok for c in r.changed]
    if undo_ops:
        summary = " ".join(r.message for r in ok)[:240]
        session.undo = UndoSnapshot(undo_ops, summary, changed)
    elif ok:
        # A change that cannot be taken back must not leave an OLDER change armed: "undo" would then revert something else.
        session.undo = None

    parts = [r.message for r in results]
    if reads:
        extra = await _read_text(ctx, session, message, reads)
        if extra:
            parts.append(extra)
    parts.extend(notes)
    if ok and undo_ops:
        parts.append("Say \"undo\" to take that back.")
    status = "SUCCESS" if len(ok) == len(results) else "PARTIAL" if ok else "FAILED"
    actions = [{"type": i.type, "ok": r.ok} for i, r in zip(intents, results)]
    return _reply(" ".join(p for p in parts if p), status, source=source, model=model, changed=changed, actions=actions, session=session, message=message)


async def _undo(api: KaizenApi, session: Session, message: str) -> Reply:
    snapshot = session.undo
    if not snapshot or snapshot.expired():
        session.undo = None
        return _reply("There's nothing to undo. I can only take back my last change, for 30 minutes after I make it.", session=session, message=message)
    session.undo = None
    problems = await run_undo(api, snapshot.ops)
    if problems:
        return _reply(f"I took back what I could, but some steps failed: {'; '.join(problems)}.", "PARTIAL", changed=snapshot.changed, session=session, message=message)
    return _reply(f"Done, I undid that: {snapshot.summary}", changed=snapshot.changed, session=session, message=message)


async def _answer_reads(ctx: ToolContext, session: Session, message: str, reads: List[Intent], notes: List[str], source: str, model: Optional[str]) -> Reply:
    kinds = {i.type for i in reads}
    if "Help" in kinds and kinds == {"Help"}:
        return _reply(HELP_TEXT, source=source, model=model, session=session, message=message)
    if "Recommend" in kinds:
        text = await _recommendation_text(ctx)
        return _reply(" ".join([text, *notes]), source="rules", session=session, message=message)
    # AskQuestion (or nothing usable): a coaching answer from the model with the user's real numbers, or the heuristic coach.
    text, answer_source, answer_model = await _coach_answer(ctx, session, message)
    return _reply(" ".join([text, *notes]), source=answer_source, model=answer_model, session=session, message=message)


async def _read_text(ctx: ToolContext, session: Session, message: str, reads: List[Intent]) -> str:
    if any(i.type == "Recommend" for i in reads):
        return await _recommendation_text(ctx)
    return ""


async def _recommendation_text(ctx: ToolContext) -> str:
    try:
        picks = await get_meal_recommendations(ctx.api, ctx.tz, ctx.date, 3)
    except ApiError as e:
        if e.status in (401, 403):
            raise
        return "I couldn't load meal suggestions right now."
    if not picks:
        return "Nothing in your foods or recipes fits what's left of today's calories. A light snack or water may be all you need."
    lines = "; ".join(f"{p['name']} ({p['calories']} kcal, {p['protein']} g protein)" for p in picks)
    return f"Based on what's left of today's targets, good options are: {lines}."


async def _coach_answer(ctx: ToolContext, session: Session, message: str) -> "tuple[str, str, str]":
    try:
        summary = await ctx.api.get("/summary", params={"date": ctx.date})
        metrics = metrics_context(summary)
    except ApiError as e:
        if e.status in (401, 403):
            raise
        metrics = None
    result = await coach_service.chat(message, history=_history_models(session), profile=profile_context(ctx.user), metrics=metrics, timeout=25.0)
    return result.reply, result.source, result.model_used


def _history_models(session: Session):
    from ..schemas.coach import ChatMessage

    return [ChatMessage(role=m["role"], content=m["content"]) for m in session.history()]


async def _without_model(ctx: ToolContext, session: Session, message: str) -> Reply:
    """The model did not answer. Questions still get the heuristic coach; actions say what the assistant can do without it."""
    # A message with numbers in it ("bench press 3 sets of 10 at 60kg") is a log command, not small talk: never answer it with advice.
    if is_question_only(message) or not (has_command_cue(message) or re.search(r"\d", message)):
        text, source, model = await _coach_answer(ctx, session, message)
        return _reply(text, source=source, model=model, session=session, message=message)
    text = (
        "I couldn't reach my language model just now, so I can only handle simple commands. Try wording it like "
        "\"ate 2 rotis and dal\", \"drank 500 ml water\", \"I weigh 71.2 kg\" or \"slept 11pm to 7am\"."
    )
    return _reply(text, "FAILED", source="fallback", session=session, message=message)


def reset(user_id: str) -> None:
    sessions.reset(user_id)


__all__ = ["chat", "reset", "INTENTS"]
