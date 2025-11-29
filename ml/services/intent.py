from typing import Optional

import joblib

from ml.config import MODELS_DIR


INTENT_MODEL_PATH = MODELS_DIR / "intent_clf.pkl"

_intent_model = None


def load_intent_model():
    global _intent_model
    if _intent_model is None and INTENT_MODEL_PATH.exists():
        _intent_model = joblib.load(INTENT_MODEL_PATH)
    return _intent_model


def predict_intent(text: str) -> Optional[str]:
    """
    Dùng mô hình nhỏ (TF-IDF + LogisticRegression) để dự đoán intent.
    Trả về: 'deadline' | 'gpa' | 'graduation' | 'credits' | 'course' | 'other' | None
    """
    model = load_intent_model()
    if not model:
        return None
    try:
        probs = model.predict_proba([text])[0]
        labels = model.classes_
        idx = int(probs.argmax())
        label = str(labels[idx])
        # Ngưỡng confidence đơn giản, nếu quá thấp thì coi như không chắc
        if float(probs[idx]) < 0.45:
            return None
        return label
    except Exception:
        return None


