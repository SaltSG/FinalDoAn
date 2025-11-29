from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression


BASE_DIR = Path(__file__).resolve().parents[1]
MODELS_DIR = BASE_DIR / "models"
MODELS_DIR.mkdir(exist_ok=True, parents=True)


def main():
    """
    Script train thử một mô hình LinearRegression dự đoán GPA/điểm.
    Hiện tại dùng dữ liệu giả lập để bạn dễ chạy thử pipeline:
      - Tạo dữ liệu synthetic cho cumGpa4, semGpa4
      - Tạo điểm grade ~ 0.4 * cumGpa4 + 0.6 * semGpa4 + noise
      - Train LinearRegression và lưu thành gpa_reg.pkl

    Sau này bạn có thể thay phần generate_data() bằng:
      - Đọc JSON/CSV export từ backend
      - Làm sạch & chọn feature thật (cumGpa4, semGpa4, điểm môn tiên quyết, tín chỉ, ...)
    """
    rng = np.random.RandomState(42)
    n_samples = 200

    cum_gpa = rng.uniform(1.5, 3.8, size=n_samples)
    sem_gpa = rng.uniform(1.5, 3.8, size=n_samples)
    noise = rng.normal(0, 0.3, size=n_samples)

    # Điểm giả lập trên thang 0-4
    grade = 0.4 * cum_gpa + 0.6 * sem_gpa + noise
    grade = np.clip(grade, 0.0, 4.0)

    df = pd.DataFrame(
        {
            "cumGpa4": cum_gpa,
            "semGpa4": sem_gpa,
            "grade": grade,
        }
    )

    X = df[["cumGpa4", "semGpa4"]].values
    y = df["grade"].values

    model = LinearRegression()
    model.fit(X, y)

    out_path = MODELS_DIR / "gpa_reg.pkl"
    joblib.dump(model, out_path)
    print(f"Đã train xong mô hình demo và lưu vào: {out_path}")


if __name__ == "__main__":
    main()


