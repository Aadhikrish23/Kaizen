"""The user's own calendar: dates and times are always read in their timezone (docs/timezone.md), never the server's."""
import re
from datetime import date, datetime, timedelta, timezone
from typing import Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def tz_for(name: Optional[str]):
    try:
        return ZoneInfo(name) if name else timezone.utc
    except (ZoneInfoNotFoundError, ValueError, OSError):
        return timezone.utc


def now_in_tz(name: Optional[str]) -> datetime:
    return datetime.now(tz_for(name))


def today_in_tz(name: Optional[str]) -> str:
    return now_in_tz(name).strftime("%Y-%m-%d")


def time_in_tz(name: Optional[str]) -> str:
    return now_in_tz(name).strftime("%H:%M")


def add_days(day: str, days: int) -> str:
    return (date.fromisoformat(day) + timedelta(days=days)).isoformat()


def is_real_date(value: str) -> bool:
    if not isinstance(value, str) or not DATE_RE.match(value):
        return False
    try:
        date.fromisoformat(value)
        return True
    except ValueError:
        return False
