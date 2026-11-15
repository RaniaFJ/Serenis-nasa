from typing import Any


COMPONENTS = [
    "cardiovascular",
    "stress",
    "sleep",
    "physical",
    "radiation",
]

STATUS_LEVELS = {
    "normal": 0,
    "attention": 1,
    "urgent": 2,
}


def normalize_component(name: str, data: dict[str, Any]) -> dict[str, Any]:
    """
    Normalize one component output.

    Urgent status is accepted only when explicitly provided by
    an upstream component with its own validated rules.
    """

    status = data.get("status")

    if name == "cardiovascular":
        status = data.get("cardiovascular_status", status)

        if status == "unusual_deviation_detected":
            status = "attention"

    elif name == "stress":
        prediction = data.get("prediction")

        if prediction == "stress":
            status = "attention"
        elif prediction == "baseline":
            status = "normal"

    if status not in ("normal", "attention", "urgent"):
        status = "not_assessed"

    return {
        "component": name,
        "status": status,
        "details": data,
    }


def assess_health(components: dict[str, dict[str, Any]]) -> dict[str, Any]:
    """
    Combine health component outputs into a transparent overall status.

    This is an informational decision-support layer, not a
    clinically validated risk prediction model.
    """

    assessed = []
    not_assessed = []

    for name in COMPONENTS:
        data = components.get(name)

        if not isinstance(data, dict):
            not_assessed.append(name)
            continue

        result = normalize_component(name, data)

        if result["status"] == "not_assessed":
            not_assessed.append(name)
        else:
            assessed.append(result)

    statuses = [item["status"] for item in assessed]

    if "urgent" in statuses:
        overall_status = "urgent_review"
    elif "attention" in statuses:
        overall_status = "review_recommended"
    elif assessed and not not_assessed:
        overall_status = "no_flagged_deviations"
    else:
        overall_status = "insufficient_data"

    return {
        "overall_status": overall_status,
        "assessed_components": assessed,
        "not_assessed_components": not_assessed,
        "assessment_count": len(assessed),
        "disclaimer": (
            "Informational decision support only. This status is not "
            "a medical diagnosis or clinically validated risk score. "
            "Unassessed categories must not be interpreted as normal."
        ),
    }
