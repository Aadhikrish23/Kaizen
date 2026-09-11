from typing import Optional, List, Dict
from ..schemas.coach import (
    UserProfileContext,
    DailyMetricsContext,
    ChatMessage,
    CoachChatResponse,
    InsightResponse
)
from .ollama_client import ollama_client
from ..config import settings

class CoachService:
    def build_system_prompt(
        self,
        profile: Optional[UserProfileContext],
        metrics: Optional[DailyMetricsContext]
    ) -> str:
        prompt_parts = [
            "You are Kaizen AI Coach, an expert fitness, nutrition, and lifestyle mentor.",
            "Your philosophy is 'Kaizen' -- continuous, steady, 1% daily improvement without burnout.",
            "Communication Style:",
            "- Be concise, positive, motivating, and strictly evidence-based.",
            "- Use clean formatting with short bullet points when recommending food or workout cues.",
            "- Avoid excessive medical disclaimers; focus on actionable everyday habit changes.",
            "- Always tailor your answers directly to the user's logged data, goals, and targets below."
        ]

        # User Profile Injection
        if profile:
            user_info = ["\n[USER PROFILE]"]
            if profile.name:
                user_info.append(f"- Name: {profile.name}")
            if profile.currentWeightKg:
                user_info.append(f"- Current Weight: {profile.currentWeightKg} kg")
            if profile.heightCm:
                user_info.append(f"- Height: {profile.heightCm} cm")
            if profile.goal:
                user_info.append(f"- Goal: {profile.goal}")
            if profile.activityLevel:
                user_info.append(f"- Activity Level: {profile.activityLevel}")
            user_info.append(f"- Daily Targets: {profile.calorieDailyTarget or 2000} kcal, {profile.proteinDailyTargetG or 150}g protein, {profile.waterDailyTargetMl or 2500}ml water")
            prompt_parts.append("\n".join(user_info))

        # Daily Progress Injection
        if metrics:
            metric_info = ["\n[TODAY'S LOGGED STATS]"]
            metric_info.append(f"- Calories: {metrics.totalCalories or 0} kcal consumed ({metrics.remainingCalories or 0} kcal remaining)")
            metric_info.append(f"- Protein: {metrics.totalProteinG or 0}g logged ({metrics.remainingProteinG or 0}g remaining)")
            metric_info.append(f"- Water Intake: {metrics.waterMl or 0} ml logged ({metrics.remainingWaterMl or 0} ml to target)")
            metric_info.append(f"- Workouts: {metrics.workoutsLogged or 0} sessions ({metrics.totalVolumeKg or 0} kg session volume)")
            prompt_parts.append("\n".join(metric_info))

        prompt_parts.append(
            "\nWhen the user asks questions about what to eat, exercises, or hydration, refer directly to their remaining calories/protein/water."
        )

        return "\n\n".join(prompt_parts)

    def _generate_fallback_reply(
        self,
        message: str,
        profile: Optional[UserProfileContext],
        metrics: Optional[DailyMetricsContext]
    ) -> str:
        """Context-aware heuristic response used when the local LLM is starting up or unreachable."""
        msg_lower = message.lower()
        name_str = f", {profile.name}" if profile and profile.name else ""

        # Nutrition / Diet / Food / Calories
        if any(w in msg_lower for w in ["eat", "food", "recipe", "protein", "calorie", "meal", "dinner", "lunch", "breakfast"]):
            rem_cal = metrics.remainingCalories if metrics and metrics.remainingCalories is not None else 500
            rem_pro = metrics.remainingProteinG if metrics and metrics.remainingProteinG is not None else 30
            return (
                f"Great question{name_str}! Looking at your dashboard today, you have about "
                f"{rem_cal} kcal and {rem_pro}g protein remaining to hit your target. "
                f"For a clean, high-protein meal, I recommend:\n\n"
                f"- **Grilled chicken breast or tofu** (150-200g) with leafy greens and olive oil.\n"
                f"- **Greek yogurt bowl** (200g 0% Greek yogurt, scoop of whey or chia seeds, fresh berries).\n"
                f"- **White fish or salmon fillet** paired with roasted asparagus and sweet potato.\n\n"
                f"Keep up the momentum -- you are right on track!"
            )

        # Workouts / Exercises / Training
        if any(w in msg_lower for w in ["workout", "exercise", "lift", "gym", "squat", "bench", "deadlift", "training"]):
            vol = metrics.totalVolumeKg if metrics and metrics.totalVolumeKg else 0
            return (
                f"Solid focus on training{name_str}! You have recorded {vol:,.0f} kg of session volume today. "
                f"Remember the core principle of progressive overload: aim for 1 extra rep or slightly tighter form on your compound lifts.\n\n"
                f"- Focus on quality eccentric control (2-3 seconds down).\n"
                f"- Keep rest periods between 90-120 seconds for hypertrophy.\n"
                f"- Prioritize mobility for your hips and thoracic spine before heavy working sets."
            )

        # Hydration
        if any(w in msg_lower for w in ["water", "hydrate", "hydration", "drink"]):
            rem_water = metrics.remainingWaterMl if metrics and metrics.remainingWaterMl is not None else 1000
            return (
                f"Hydration is foundational for mental clarity and muscle protein synthesis{name_str}. "
                f"You have approximately {rem_water} ml remaining today to hit your hydration target. "
                f"Grab a 500ml glass right now, perhaps with a pinch of mineral salt if you trained hard today."
            )

        # General coaching
        return (
            f"Here is your daily Kaizen coaching insight{name_str}: Small, consistent wins compound into massive health transformations. "
            f"Focus on hitting your remaining nutrition targets today, get 7-8 hours of deep sleep, and celebrate the effort you put in."
        )

    async def chat(
        self,
        message: str,
        history: Optional[List[ChatMessage]] = None,
        profile: Optional[UserProfileContext] = None,
        metrics: Optional[DailyMetricsContext] = None
    ) -> CoachChatResponse:
        system_prompt = self.build_system_prompt(profile, metrics)
        
        messages: List[Dict[str, str]] = [{"role": "system", "content": system_prompt}]
        
        if history:
            for h in history[-8:]:  # keep last 8 turns for context window efficiency
                messages.append({"role": h.role, "content": h.content})

        messages.append({"role": "user", "content": message})

        # Send to Ollama
        llm_reply = await ollama_client.chat(messages, model=settings.OLLAMA_MODEL)

        if llm_reply:
            return CoachChatResponse(
                reply=llm_reply,
                model_used=settings.OLLAMA_MODEL,
                context_applied=True,
                source="ollama"
            )

        # Fallback if Ollama is loading or unreachable
        fallback_reply = self._generate_fallback_reply(message, profile, metrics)
        return CoachChatResponse(
            reply=fallback_reply,
            model_used="heuristic-coach",
            context_applied=True,
            source="fallback"
        )

    async def get_insight(
        self,
        profile: Optional[UserProfileContext],
        metrics: Optional[DailyMetricsContext]
    ) -> InsightResponse:
        system_prompt = (
            "You are Kaizen AI Coach. Provide a single, punchy, 1-2 sentence motivating insight or tip "
            "based on the user's progress. No filler, no conversational greeting, just the direct tip."
        )
        user_prompt = "Give me today's 1-sentence health insight."
        if metrics:
            user_prompt += f" Logged today: {metrics.totalCalories} kcal, {metrics.totalProteinG}g protein, {metrics.waterMl}ml water."

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        llm_reply = await ollama_client.chat(messages, model=settings.OLLAMA_MODEL, temperature=0.7)
        if llm_reply:
            return InsightResponse(insight=llm_reply.strip('\"'), category="daily", model_used=settings.OLLAMA_MODEL)

        # Heuristic Insight
        if metrics and metrics.remainingCalories and metrics.remainingCalories > 0:
            insight = f"You have {metrics.remainingCalories} kcal and {metrics.remainingProteinG or 30}g protein remaining today -- prioritize a protein-packed dinner to recover strong."
        else:
            insight = "Consistent daily hydration and 7-8 hours of quality sleep are your best performance enhancers."

        return InsightResponse(insight=insight, category="daily", model_used="heuristic-coach")

coach_service = CoachService()
