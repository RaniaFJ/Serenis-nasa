from typing import Any


def analyze_sleep(
    sleep_duration_hours: float,
    sleep_efficiency_percent: float | None = None,
    sleep_debt_hours: float | None = None,
) -> dict[str, Any]:
    """
    Illustrative rule-based sleep assessment.
    Thresholds are not clinically validated.
    """

    flags = []
    recommendations = []

    # Sleep duration
    if sleep_duration_hours < 5.5:
        flags.append("very_short_sleep_duration")
        recommendations.append(
            "Prioritize recovery sleep and review the sleep schedule."
        )
    elif sleep_duration_hours < 7:
        flags.append("short_sleep_duration")
        recommendations.append(
            "Aim for a consistent sleep schedule with sufficient rest."
        )
    elif sleep_duration_hours > 9:
        flags.append("long_sleep_duration")
        recommendations.append(
            "Monitor prolonged sleep and review fatigue or mood trends."
        )

    # Sleep efficiency
    if sleep_efficiency_percent is not None:
        if sleep_efficiency_percent < 85:
            flags.append("low_sleep_efficiency")
            recommendations.append(
                "Reduce sleep interruptions and improve the sleep environment."
            )

    # Accumulated sleep debt
    if sleep_debt_hours is not None:
        if sleep_debt_hours >= 2:
            flags.append("elevated_sleep_debt")
            recommendations.append(
                "Schedule recovery time to reduce accumulated sleep debt."
            )

    status = "attention" if flags else "normal"

    return {
        "status": status,
        "sleep_duration_hours": round(sleep_duration_hours, 2),
        "sleep_efficiency_percent": (
            round(sleep_efficiency_percent, 2)
            if sleep_efficiency_percent is not None
            else None
        ),
        "sleep_debt_hours": (
            round(sleep_debt_hours, 2)
            if sleep_debt_hours is not None
            else None
        ),
        "flags": flags,
        "recommendations": recommendations,
        "method": "Illustrative rule-based sleep assessment",
        "disclaimer": (
            "Informational prototype only. Thresholds are illustrative "
            "and are not clinically validated or diagnostic."
        ),
    }
