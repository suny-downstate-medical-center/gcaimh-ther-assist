#!/usr/bin/env python3
"""
Session Context Retrieval Tool — Cloud Function
Called by the multi-session-context agent to fetch prior session data.
"""
import functions_framework
from flask import jsonify, request
from google.cloud import firestore
from datetime import datetime, timedelta
import logging

db = firestore.Client()
logger = logging.getLogger(__name__)


@functions_framework.http
def session_context_tool(request):
    """Retrieve session history for a patient."""
    data = request.get_json(silent=True) or {}
    action = data.get("action", "get_history")
    patient_id = data.get("patient_id")

    if not patient_id:
        return jsonify({"error": "patient_id is required"}), 400

    if action == "get_history":
        return get_session_history(patient_id, data.get("limit", 5))
    elif action == "get_risk_trajectory":
        return get_risk_trajectory(patient_id)
    elif action == "get_treatment_progress":
        return get_treatment_progress(patient_id)
    elif action == "store_summary":
        return store_session_summary(patient_id, data)
    else:
        return jsonify({"error": f"Unknown action: {action}"}), 400


def get_session_history(patient_id: str, limit: int = 5):
    """Fetch the N most recent session summaries for a patient."""
    sessions = (
        db.collection("session_summaries")
        .where("patient_id", "==", patient_id)
        .order_by("session_date", direction=firestore.Query.DESCENDING)
        .limit(limit)
        .stream()
    )

    history = []
    for doc in sessions:
        session = doc.to_dict()
        session["doc_id"] = doc.id
        # Convert timestamps to ISO strings for JSON serialization
        if "session_date" in session and hasattr(session["session_date"], "isoformat"):
            session["session_date"] = session["session_date"].isoformat()
        history.append(session)

    return jsonify({
        "patient_id": patient_id,
        "session_count": len(history),
        "sessions": history,
        "has_prior_context": len(history) > 0,
    })


def get_risk_trajectory(patient_id: str):
    """Analyze risk level changes across recent sessions."""
    sessions = (
        db.collection("session_summaries")
        .where("patient_id", "==", patient_id)
        .order_by("session_date", direction=firestore.Query.DESCENDING)
        .limit(10)
        .stream()
    )

    risk_levels = {"low": 1, "moderate": 2, "high": 3, "critical": 4}
    trajectory = []
    for doc in sessions:
        session = doc.to_dict()
        risk = session.get("risk_level", "low")
        trajectory.append({
            "session_number": session.get("session_number", 0),
            "risk_level": risk,
            "risk_score": risk_levels.get(risk, 0),
            "safety_concerns": session.get("safety_concerns", []),
        })

    trajectory.reverse()  # Chronological order

    # Determine trend
    if len(trajectory) >= 2:
        recent = trajectory[-1]["risk_score"]
        previous = trajectory[-2]["risk_score"]
        if recent < previous:
            trend = "improving"
        elif recent > previous:
            trend = "worsening"
        else:
            trend = "stable"
    else:
        trend = "insufficient_data"

    return jsonify({
        "patient_id": patient_id,
        "trajectory": trajectory,
        "trend": trend,
        "current_risk": trajectory[-1]["risk_level"] if trajectory else "unknown",
    })


def get_treatment_progress(patient_id: str):
    """Track treatment goal progress across sessions."""
    sessions = (
        db.collection("session_summaries")
        .where("patient_id", "==", patient_id)
        .order_by("session_date", direction=firestore.Query.DESCENDING)
        .limit(10)
        .stream()
    )

    all_goals = {}
    homework_tracking = []

    for doc in sessions:
        session = doc.to_dict()

        # Aggregate goal progress
        for goal in session.get("treatment_goals", []):
            if goal not in all_goals:
                all_goals[goal] = []
            progress = session.get("goal_progress", {}).get(goal)
            if progress is not None:
                all_goals[goal].append({
                    "session_number": session.get("session_number", 0),
                    "progress": progress,
                })

        # Track homework completion
        homework = session.get("homework_assigned", [])
        completion = session.get("homework_completion", {})
        if homework:
            homework_tracking.append({
                "session_number": session.get("session_number", 0),
                "assigned": homework,
                "completion": completion,
            })

    return jsonify({
        "patient_id": patient_id,
        "treatment_goals": all_goals,
        "homework_tracking": homework_tracking,
    })


def store_session_summary(patient_id: str, data: dict):
    """Store a new session summary after analysis."""
    session_number = data.get("session_number", 1)
    doc_id = f"{patient_id}_{datetime.now().strftime('%Y%m%d')}_{session_number}"

    summary = {
        "patient_id": patient_id,
        "session_date": datetime.now(),
        "session_number": session_number,
        "therapist_id": data.get("therapist_id", "unknown"),
        "modality": data.get("modality", "unknown"),
        "risk_level": data.get("risk_level", "low"),
        "safety_concerns": data.get("safety_concerns", []),
        "key_themes": data.get("key_themes", []),
        "treatment_goals": data.get("treatment_goals", []),
        "goal_progress": data.get("goal_progress", {}),
        "homework_assigned": data.get("homework_assigned", []),
        "homework_completion": data.get("homework_completion", {}),
        "clinical_summary": data.get("clinical_summary", ""),
        "risk_trajectory": data.get("risk_trajectory", "stable"),
        "next_session_focus": data.get("next_session_focus", []),
    }

    db.collection("session_summaries").document(doc_id).set(summary)
    return jsonify({"status": "stored", "doc_id": doc_id})
