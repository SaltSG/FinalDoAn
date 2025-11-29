import unicodedata
import re
from typing import Optional, Dict, Any

# Alias thô cho một số môn học thường gặp
ALIAS_MAP = {
    "csdl": "cơ sở dữ liệu",
    "lt web": "lập trình web",
    "ttcn": "thực tập chuyên ngành",
    "cn": "chuyên ngành",
    "tttn": "thực tập tốt nghiệp",
    "đồ án": "đồ án tốt nghiệp",
    "do an": "đồ án tốt nghiệp",
    "kh&cn": "khoa học và công nghệ",
}


def normalize(text: str) -> str:
    """Lowercase + bỏ dấu tiếng Việt + gọn khoảng trắng để so khớp chuỗi đơn giản."""
    text = text.lower()
    # Chuẩn hoá riêng chữ đ -> d để dễ so khớp từ khoá (điểm -> diem, đếm -> dem, ...)
    text = text.replace("đ", "d")
    # Bỏ dấu tiếng Việt
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    # Thay thế các alias thô
    for k, v in ALIAS_MAP.items():
        text = text.replace(k, v)
    # Gọn khoảng trắng
    return " ".join(text.split())


def find_course_in_text(message: str, ctx: Dict[str, Any]) -> Optional[Dict[str, str]]:
    """Tìm môn học được nhắc tới trong câu hỏi dựa trên curriculum và kết quả đã học.
    Trả về {'code': str, 'name': str}
    """
    curriculum = ctx.get("curriculum") or {}
    semesters = curriculum.get("semesters") or []
    norm_text = normalize(message)
    
    # Rút ra số ở cuối câu hỏi (nếu có)
    text_numbers = re.findall(r"\d+", norm_text)
    text_num: Optional[int] = int(text_numbers[-1]) if text_numbers else None

    best: Optional[Dict[str, str]] = None

    for sem in semesters:
        for course in sem.get("courses", []):
            code = str(course.get("code") or "")
            name = str(course.get("name") or "")
            if not code and not name:
                continue

            code_norm = code.lower()
            name_norm = normalize(name) if name else ""
            
            # Tách số thứ tự ở cuối tên môn
            course_num: Optional[int] = None
            base_name_norm: Optional[str] = None
            # Regex để tìm số (ví dụ: "Toan cao cap 1" -> 1)
            m = re.search(r"(\d+)$", name_norm)
            if m:
                course_num = int(m.group(1))
                base_name_norm = name_norm[: m.start()].rstrip()

            # 1. Khớp theo mã môn học
            if code and code_norm in norm_text:
                return {"code": code, "name": name or code}
            
            # 2. Khớp theo tên đầy đủ (ưu tiên cao nhất)
            if name and name_norm and name_norm in norm_text:
                # Chỉ chấp nhận nếu:
                # - Câu hỏi không có số (text_num is None)
                # - HOẶC số của câu hỏi và số của môn học trùng nhau
                if text_num is None or course_num is None or text_num == course_num:
                    return {"code": code, "name": name}
                continue # Nếu số không trùng, bỏ qua

            # 3. Khớp theo tên không có số cuối (User hay bỏ số 1,2,3)
            elif base_name_norm and base_name_norm in norm_text:
                # Nếu câu hỏi không có số HOẶC môn học không có số -> match
                if text_num is None or course_num is None:
                    best = {"code": code, "name": name}
                    continue
                # Nếu cả hai đều có số và trùng nhau
                if text_num == course_num:
                    best = {"code": code, "name": name}
                    
    # Nếu không có khớp chính xác, trả về khớp gần nhất (nếu có)
    return best