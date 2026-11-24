"""Reading what the user wrote: numbers, times, relative days, meal types, yes/no. Plain deterministic code, no model."""
import re
from typing import List, Optional, Set

_NUMBER_WORDS = {
    "a": 1, "an": 1, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "eleven": 11, "twelve": 12, "fifteen": 15, "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50, "half": 0.5,
}
_DIGITS_RE = re.compile(r"(?<![\w.])(\d+(?:[.,]\d+)?)(?![\w])|(\d+(?:[.,]\d+)?)(?=[a-zA-Z])")
_FRACTION_RE = re.compile(r"\b(\d+)\s*/\s*(\d+)\b")

YES_RE = re.compile(r"^\s*(?:yes|yeah|yep|yup|sure|ok|okay|y|do it|go ahead|go for it|confirm(?:ed)?|please do|proceed|that'?s right|correct)\s*[.!]*\s*$", re.I)
NO_RE = re.compile(r"^\s*(?:no|nope|nah|n|cancel|stop|never ?mind|don'?t|do not|abort|leave it)\s*[.!]*\s*$", re.I)
UNDO_RE = re.compile(r"^\s*(?:(?:ok(?:ay)?|oops|wait|no|sorry|hmm+)[,!.\s]+)*(?:please\s+)?(?:can you\s+)?(?:undo|revert|take (?:that|it) back)(?:\s+(?:that|it|this|everything|(?:the )?last (?:one|change|thing)))?(?:\s+please)?\s*[.!]*\s*$", re.I)
GREETING_RE = re.compile(r"^\s*(?:hi|hello|hey|yo|good (?:morning|afternoon|evening)|thanks|thank you|thx|cheers)\b[\s!.,a-z]{0,20}$", re.I)
HELP_RE = re.compile(r"^\s*(?:help|what can you do|what do you do|commands|how do (?:i|you) use (?:this|you))\s*[?.!]*\s*$", re.I)


def numbers_in(message: str) -> Set[float]:
    """Every number the user wrote, as digits ("2", "1.5", "1,5", "1/2") or words ("two", "half")."""
    found: Set[float] = set()
    for m in _DIGITS_RE.finditer(message):
        raw = m.group(1) or m.group(2)
        try:
            found.add(float(raw.replace(",", ".")))
        except ValueError:
            pass
    for m in _FRACTION_RE.finditer(message):
        if int(m.group(2)):
            found.add(int(m.group(1)) / int(m.group(2)))
    for word in re.findall(r"[a-z]+", message.lower()):
        if word in _NUMBER_WORDS:
            found.add(float(_NUMBER_WORDS[word]))
    return found


def mentions_number(value: float, message: str, tolerance: float = 0.011) -> bool:
    return any(abs(value - n) <= max(tolerance, abs(n) * 0.0005) for n in numbers_in(message))


def days_ago_from(message: str) -> int:
    """How many days back the user means. Taken from their own words only, never from the model."""
    m = message.lower()
    if re.search(r"\bday before yesterday\b", m):
        return 2
    if re.search(r"\byesterday\b", m):
        return 1
    found = re.search(r"\b(\d{1,2})\s+days?\s+ago\b", m)
    if found:
        return min(int(found.group(1)), 30)
    words = re.search(r"\b(two|three|four|five|six|seven)\s+days?\s+ago\b", m)
    if words:
        return int(_NUMBER_WORDS[words.group(1)])
    return 0


_MEAL_WORDS = {"breakfast": "breakfast", "brunch": "lunch", "lunch": "lunch", "dinner": "dinner", "supper": "dinner", "snack": "snack", "snacks": "snack"}


def meal_type_from(message: str) -> Optional[str]:
    for word in re.findall(r"[a-z]+", message.lower()):
        if word in _MEAL_WORDS:
            return _MEAL_WORDS[word]
    return None


def meal_type_for_hour(hour: int) -> str:
    return "breakfast" if hour < 11 else "lunch" if hour < 16 else "snack" if hour < 18 else "dinner"


_CLOCK_RE = re.compile(r"^\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\s*$", re.I)


def parse_clock(text: str) -> Optional[str]:
    """"11pm" -> "23:00", "7:30 am" -> "07:30", "23:15" -> "23:15", "midnight" -> "00:00". None when ambiguous or invalid."""
    t = text.strip().lower()
    if t == "midnight":
        return "00:00"
    if t == "noon":
        return "12:00"
    m = _CLOCK_RE.match(t)
    if not m:
        return None
    hour, minute, meridiem = int(m.group(1)), int(m.group(2) or 0), (m.group(3) or "").replace(".", "")
    if minute > 59:
        return None
    if meridiem:
        if not 1 <= hour <= 12:
            return None
        hour = (hour % 12) + (12 if meridiem == "pm" else 0)
    elif m.group(2) is None:
        return None  # a bare "7" could be morning or evening: ask instead of guessing
    if hour > 23:
        return None
    return f"{hour:02d}:{minute:02d}"


def significant_words(text: str) -> List[str]:
    return [w for w in re.findall(r"[a-z0-9']+", text.lower()) if len(w) > 1]


def stem(word: str) -> str:
    for suffix in ("ies", "es", "s"):
        if word.endswith(suffix) and len(word) - len(suffix) >= 3:
            return word[: -len(suffix)] + ("y" if suffix == "ies" else "")
    return word


def words_present(name: str, message: str) -> bool:
    """Every significant word of `name` appears in the message (ignoring plural endings)."""
    haystack = {stem(w) for w in significant_words(message)} | set(significant_words(message))
    return all(stem(w) in haystack or w in haystack for w in significant_words(name))


_QUESTION_START = re.compile(r"^\s*(?:what|what's|whats|how|how's|why|when|where|which|who|is|are|am|do|does|did|can|could|would|should|will|may|any|tell me|show me|give me|explain|list)\b", re.I)
_COMMAND_CUE = re.compile(
    r"\b(?:i\s+(?:just\s+)?(?:ate|had|drank|drink|weigh(?:ed)?|slept|lifted|did|ran|worked out|trained|logged)|log|add|record|track|set|change|update|make|create|"
    r"generate|build|start|begin|adapt|put|save|mark|i'?m\s+\d|my weight is|weighed|slept|drank|ate|had)\b",
    re.I,
)


def is_question_only(message: str) -> bool:
    """A question with no instruction in it ("should I eat more protein?"): it must never change data."""
    stripped = message.strip()
    asks = stripped.endswith("?") or bool(_QUESTION_START.match(stripped))
    if not asks:
        return False
    # "can you log 500 ml water?" is a polite command, not a question.
    return not re.match(r"^\s*(?:can|could|would|will)\s+you\s+(?:please\s+)?(?:log|add|record|track|set|change|update|make|create|generate|build|start|adapt|put|save|mark)\b", stripped, re.I) and not re.match(
        r"^\s*(?:please\s+)?(?:log|add|record|track|set|change|update|make|create|generate|build|start|adapt)\b", stripped, re.I
    )


def has_command_cue(message: str) -> bool:
    return bool(_COMMAND_CUE.search(message))
