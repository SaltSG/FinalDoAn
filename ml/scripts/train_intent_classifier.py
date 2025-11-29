from pathlib import Path

import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline


BASE_DIR = Path(__file__).resolve().parents[1]
MODELS_DIR = BASE_DIR / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)


def build_training_data():
    # Dataset nhỏ, bạn có thể mở rộng thêm câu hỏi thật của mình sau
    data = [
        # deadline
        ("deadline tuần này là gì", "deadline"),
        ("các deadline sắp tới của tôi", "deadline"),
        ("hôm nay có deadline nào không", "deadline"),
        ("những deadline còn lại", "deadline"),
        ("deadline môn lập trình web", "deadline"),
        # GPA / điểm
        ("gpa của tôi là bao nhiêu", "gpa"),
        ("điểm trung bình tích lũy", "gpa"),
        ("điểm học kỳ trước của tôi", "gpa"),
        ("tính giúp tôi gpa", "gpa"),
        ("điểm của tôi đang là bao nhiêu", "gpa"),
        # ra trường đúng hạn
        ("tôi có ra trường đúng hạn không", "graduation"),
        ("nguy cơ trễ tốt nghiệp của tôi", "graduation"),
        ("tôi có dễ bị trễ tốt nghiệp không", "graduation"),
        ("đánh giá khả năng ra trường đúng hạn", "graduation"),
        ("rủi ro không tốt nghiệp đúng hạn", "graduation"),
        # tín chỉ / nợ môn
        ("tôi học được bao nhiêu tín rồi", "credits"),
        ("tôi còn thiếu bao nhiêu tín chỉ nữa", "credits"),
        ("tôi còn nợ môn nào", "credits"),
        ("tổng số tín chỉ tôi đã tích lũy", "credits"),
        ("tình hình tín chỉ và môn nợ của tôi", "credits"),
        # môn học / lộ trình
        ("môn cơ sở dữ liệu dạy những gì", "course"),
        ("môn lập trình web học gì", "course"),
        ("tôi nên học môn gì tiếp theo", "course"),
        ("gợi ý lộ trình môn học cho tôi", "course"),
        ("môn nào phù hợp để cải thiện gpa", "course"),
        # other / fallback
        ("chào bạn", "other"),
        ("hello", "other"),
        ("bạn là ai", "other"),
        ("hướng dẫn sử dụng hệ thống", "other"),
        ("tôi muốn biết thêm thông tin", "other"),
    ]
    texts = [t for t, _ in data]
    labels = [y for _, y in data]
    return texts, labels


def main():
    texts, labels = build_training_data()

    pipeline = Pipeline(
        [
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), lowercase=True)),
            ("clf", LogisticRegression(max_iter=1000)),
        ]
    )

    pipeline.fit(texts, labels)

    out_path = MODELS_DIR / "intent_clf.pkl"
    joblib.dump(pipeline, out_path)
    print(f"Đã train xong mô hình phân loại intent và lưu vào: {out_path}")


if __name__ == "__main__":
    main()


