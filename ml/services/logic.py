from typing import Optional, Dict, Any, List

import sys

import json
from ml.services.data_client import (
    fetch_deadlines_for_user,
    fetch_results_for_user,
    fetch_full_context,
)
from ml.services.intent import predict_intent
from ml.services.nlp_utils import find_course_in_text, normalize
from ml.services.llm_client import ask_general_llm
from datetime import datetime

# --- Session-level conversational state (đơn giản, lưu trong RAM của process) ---

_SESSION_STATE: Dict[str, Dict[str, Any]] = {}


def _get_session_state(user_id: Optional[str]) -> Dict[str, Any]:
    """
    Trả về state hội thoại tạm thời cho từng user (dựa theo user_id).
    Hiện dùng để nhớ last_intent, last_course,... giữa các câu hỏi.
    """
    key = user_id or "_anon"
    st = _SESSION_STATE.get(key)
    if st is None:
        st = {}
        _SESSION_STATE[key] = st
    return st


# --- Utility Functions ---

def four_from_10(grade10: float) -> float:
    """
    Chuyển đổi điểm hệ 10 sang hệ 4.
    Theo bảng: 8.95-10 → 4.0, 8.45-8.94 → 3.7, 7.95-8.44 → 3.5, 
    6.95-7.94 → 3.0, 6.45-6.94 → 2.5, 5.45-6.44 → 2.0, 
    4.95-5.44 → 1.5, 3.95-4.94 → 1.0, dưới 3.95 → 0.0
    """
    if grade10 >= 8.95:
        return 4.0
    elif grade10 >= 8.45:
        return 3.7
    elif grade10 >= 7.95:
        return 3.5
    elif grade10 >= 6.95:
        return 3.0
    elif grade10 >= 6.45:
        return 2.5
    elif grade10 >= 5.45:
        return 2.0
    elif grade10 >= 4.95:
        return 1.5
    elif grade10 >= 3.95:
        return 1.0
    else:
        return 0.0


def _get_user_name(user_id: Optional[str]) -> Optional[str]:
    """
    Lấy tên người dùng từ context chung để cá nhân hóa lời chào.
    Dùng lại /api/chatbot/context để tránh phải mở thêm API mới.
    """
    if not user_id:
        return None
    ctx = fetch_full_context(user_id)
    if not ctx:
        return None
    user = ctx.get("user") or {}
    name = (user.get("name") or "").strip()
    return name or None


def _calculate_gpa_and_credits(
    user_id: str,
    ctx: Dict[str, Any],
) -> Dict[str, Any]:
    """Tính GPA tích lũy, tín chỉ tích lũy, và danh sách môn nợ."""
    # Trong /api/chatbot/context, backend trả:
    # - results: object {semesterKey: {courseCode: {grade,status,...}}}
    # - curriculum: object với field semesters
    results_data = ctx.get("results") or {}
    curriculum = ctx.get("curriculum") or {}

    if not results_data or not curriculum:
        return {
            "gpa": None,
            "total_credits_passed": 0,
            "total_credits_gpa": 0,
            "required_credits": 0,
            "required_credits_gpa": 0,
            "debt_courses": [],
            "error": "Không tìm thấy dữ liệu kết quả học tập hoặc chương trình học.",
        }

    total_gpa_points = 0.0
    total_credits_gpa = 0
    total_credits_passed = 0
    debt_courses: List[Dict[str, Any]] = []

    # Map môn học theo code để dễ tra cứu
    course_map: Dict[str, Dict[str, Any]] = {}
    for sem in curriculum.get("semesters", []):
        for course in sem.get("courses", []):
            course_map[course.get("code", "")] = course

    # Tính toán
    for semester_data in results_data.values():
        for code, result in semester_data.items():
            course_info = course_map.get(code)

            # Nếu chương trình học không có thông tin môn này thì bỏ qua
            if not course_info:
                continue

            # Bỏ qua các môn không tính GPA hoặc không tính tín chỉ
            is_count_in_gpa = course_info.get("countInGpa", False)
            is_count_in_credits = course_info.get("countInCredits", False)
            course_credit = course_info.get("credit", 0)

            # Lấy điểm & trạng thái từ kết quả
            raw_grade = result.get("grade", None)
            grade: Optional[float]
            if isinstance(raw_grade, (int, float)):
                grade = float(raw_grade)
            else:
                grade = None
            status = str(result.get("status", "") or "").lower()

            # Tính điểm GPA (hệ 10) – chỉ tính khi có điểm số
            if (
                is_count_in_gpa
                and course_credit > 0
                and grade is not None
            ):
                total_gpa_points += grade * course_credit
                total_credits_gpa += course_credit

            # Tín chỉ đã qua / nợ:
            # - passed  => cộng vào total_credits_passed
            # - failed  => tính là môn nợ
            # - thiếu grade hoặc status khác (chưa học / đang học) => KHÔNG tính là nợ
            if is_count_in_credits and course_credit > 0:
                if status == "passed":
                    total_credits_passed += course_credit
                elif status == "failed":
                    debt_courses.append(
                        {
                            "code": code,
                            "name": course_info.get("name", code),
                            "credit": course_credit,
                            "grade": grade if grade is not None else 0.0,
                        }
                    )

    gpa = (total_gpa_points / total_credits_gpa) if total_credits_gpa > 0 else 0.0

    # Tính tổng tín chỉ yêu cầu
    required_credits = sum(
        c.get("credit", 0)
        for sem in curriculum.get("semesters", [])
        for c in sem.get("courses", [])
        if c.get("countInCredits", False)
    )
    required_credits_gpa = sum(
        c.get("credit", 0)
        for sem in curriculum.get("semesters", [])
        for c in sem.get("courses", [])
        if c.get("countInGpa", False)
    )

    return {
        "gpa": round(gpa, 2),
        "total_credits_passed": total_credits_passed,
        "total_credits_gpa": total_credits_gpa,
        "required_credits": required_credits,
        "required_credits_gpa": required_credits_gpa,
        "debt_courses": debt_courses,
    }


def _answer_deadline(message: str, user_id: str) -> str:
    ctx = fetch_full_context(user_id)
    if not ctx:
        data = fetch_deadlines_for_user(user_id)
        if not data or "data" not in data:
            return "Mình không lấy được danh sách deadline từ backend (có thể server đang tắt)."
        items = data.get("data") or []
        total = len(items)
        completed = sum(1 for d in items if (d.get("status") == "completed"))
        incomplete = total - completed
        if total == 0:
            return "Hiện tại bạn chưa có deadline nào trong hệ thống."
        return (
            f"Bạn đang có tổng cộng {total} deadline, trong đó {completed} đã hoàn thành "
            f"và {incomplete} đang còn lại. Bạn có thể vào trang Deadline hoặc Lịch để xem chi tiết."
        )

    deadlines = ctx.get("deadlines") or []
    course = find_course_in_text(message, ctx)

    if course:
        code = course["code"]
        name = course["name"]
        norm_code = code.lower()
        
        # Lọc deadline theo môn học (bỏ lịch thi)
        course_deadlines = [
            d
            for d in deadlines
            if d.get("courseCode", "").lower() == norm_code and not d.get("isExam", False)
        ]
        
        if not course_deadlines:
            return f"Mình không tìm thấy deadline nào cho môn **{name} ({code})**."

        overdue_count = sum(
            1 for d in course_deadlines if d.get("status") == "overdue"
        )
        # Trong hệ thống của bạn status dùng: upcoming / ongoing / overdue / completed
        pending_count = sum(
            1
            for d in course_deadlines
            if d.get("status") in ("upcoming", "ongoing")
        )
        completed_count = sum(
            1 for d in course_deadlines if d.get("status") == "completed"
        )
        
        reply = f"Môn **{name} ({code})** có tổng cộng **{len(course_deadlines)}** deadline:\n"
        if pending_count > 0:
            reply += f"- **{pending_count}** đang chờ xử lý.\n"
        if overdue_count > 0:
            reply += f"- **{overdue_count}** đã quá hạn (cần hoàn thành sớm).\n"
        if completed_count > 0:
            reply += f"- **{completed_count}** đã hoàn thành.\n"
            
        # Gợi ý deadline gần nhất còn hạn (upcoming/ongoing)
        next_deadline = next(
            (
                d
                for d in sorted(
                    course_deadlines, key=lambda x: x.get("endAt", "")
                )
                if d.get("status") in ("upcoming", "ongoing")
            ),
            None,
        )
        
        if next_deadline:
            end_at_str = next_deadline.get("endAt")
            try:
                # Định dạng lại thời gian
                end_at = datetime.fromisoformat(end_at_str.replace("Z", "+00:00")).strftime("%H:%M ngày %d/%m/%Y")
            except Exception:
                end_at = "không rõ"
            reply += f"Deadline gần nhất còn hạn là **{next_deadline['title']}** (kết thúc lúc {end_at})."
        
        return reply

    # Trả lời chung nếu không tìm thấy môn học cụ thể (bỏ lịch thi)
    pending_deadlines = [
        d for d in deadlines 
        if d.get("status") in ("upcoming", "ongoing") and not d.get("isExam", False)
    ]

    if len(pending_deadlines) == 0:
        return "Bạn không có deadline nào đang chờ xử lý. Cứ yên tâm học tập!"

    reply = f"Bạn có **{len(pending_deadlines)} deadline đang chờ xử lý:**\n\n"
    
    # Sắp xếp theo thời hạn (sớm nhất trước)
    sorted_pending = sorted(pending_deadlines, key=lambda x: x.get("endAt", ""))
    for d in sorted_pending:
        title = d.get("title", "Không có tiêu đề")
        end_at_str = d.get("endAt")
        try:
            if end_at_str:
                end_at = datetime.fromisoformat(end_at_str.replace("Z", "+00:00")).strftime("%d/%m/%Y %H:%M")
            else:
                end_at = "chưa có thời hạn"
        except Exception:
            end_at = "chưa có thời hạn"
        status_text = "đang diễn ra" if d.get("status") == "ongoing" else "sắp tới"
        reply += f"- **{title}** - {end_at} ({status_text})\n"
    
    return reply


def _answer_exam_schedule(message: str, user_id: str) -> str:
    """
    Trả lời về **lịch thi** (ngày/giờ thi), dựa trên các deadline có isExam = True.
    - Nếu người dùng nhắc tới một môn cụ thể → trả lời lịch thi của môn đó.
    - Nếu không → tóm tắt các lịch thi sắp tới / đã thi.
    """
    ctx = fetch_full_context(user_id)
    if not ctx:
        data = fetch_deadlines_for_user(user_id)
        if not data or "data" not in data:
            return "Mình không lấy được danh sách lịch thi từ backend (có thể server đang tắt)."
        deadlines = data.get("data") or []
    else:
        deadlines = ctx.get("deadlines") or []

    exam_deadlines = [d for d in deadlines if d.get("isExam")]
    if not exam_deadlines:
        return "Hiện mình không thấy lịch thi nào được lưu trong hệ thống cho bạn."

    # Nếu câu hỏi nhắc tới một môn cụ thể
    course = find_course_in_text(message, ctx or {})
    if course:
        code = course["code"]
        name = course["name"]
        norm_code = code.lower()

        course_exams = [
            d
            for d in exam_deadlines
            if str(d.get("courseCode", "")).lower() == norm_code
        ]
        if not course_exams:
            return f"Mình không tìm thấy lịch thi nào được lưu cho môn **{name} ({code})**."

        # Sắp xếp theo thời gian thi (endAt ưu tiên, fallback startAt)
        def _exam_key(d: Dict[str, Any]) -> str:
            return d.get("endAt") or d.get("startAt") or ""

        course_exams_sorted = sorted(course_exams, key=_exam_key)

        # Lịch thi gần nhất còn hiệu lực (upcoming/ongoing)
        next_exam = next(
            (
                d
                for d in course_exams_sorted
                if d.get("status") in ("upcoming", "ongoing")
            ),
            None,
        )

        reply_lines: List[str] = []
        if next_exam:
            end_at_str = next_exam.get("endAt") or next_exam.get("startAt")
            try:
                end_at = datetime.fromisoformat(
                    str(end_at_str).replace("Z", "+00:00")
                ).strftime("%H:%M ngày %d/%m/%Y")
            except Exception:
                end_at = "không rõ thời gian"
            reply_lines.append(
                f"Lịch thi gần nhất của môn **{name} ({code})** là **{next_exam.get('title', 'Thi cuối kỳ')}**, "
                f"dự kiến vào **{end_at}**."
            )
        else:
            reply_lines.append(
                f"Mình không thấy lịch thi sắp tới cho môn **{name} ({code})** (có thể bạn đã thi xong hoặc lịch chưa được nhập)."
            )

        # Nếu có các lần thi trước đó (overdue/completed) thì thông báo thêm
        past_exams = [
            d for d in course_exams_sorted if d.get("status") in ("overdue", "completed")
        ]
        if past_exams:
            latest_past = past_exams[-1]
            past_time_str = latest_past.get("endAt") or latest_past.get("startAt")
            try:
                past_time = datetime.fromisoformat(
                    str(past_time_str).replace("Z", "+00:00")
                ).strftime("%H:%M ngày %d/%m/%Y")
            except Exception:
                past_time = "không rõ thời gian"
            reply_lines.append(
                f"Lần thi gần nhất trước đó diễn ra vào **{past_time}** "
                f"({latest_past.get('status', 'overdue')})."
            )

        return "\n".join(reply_lines)

    # Nếu không nhắc tới môn cụ thể → tóm tắt tất cả lịch thi
    upcoming = [
        d for d in exam_deadlines if d.get("status") in ("upcoming", "ongoing")
    ]
    past = [d for d in exam_deadlines if d.get("status") in ("overdue", "completed")]

    if not upcoming and not past:
        return "Hiện mình không thấy lịch thi nào được lưu trong hệ thống cho bạn."

    reply = "Tóm tắt **lịch thi** của bạn trong hệ thống:\n"

    def _fmt_time(raw: Any) -> str:
        if not raw:
            return "không rõ thời gian"
        try:
            return datetime.fromisoformat(str(raw).replace("Z", "+00:00")).strftime(
                "%H:%M ngày %d/%m/%Y"
            )
        except Exception:
            return "không rõ thời gian"

    if upcoming:
        reply += "- **Các lịch thi sắp tới**:\n"
        # Lấy tối đa 5 lịch thi sắp tới, sắp xếp theo thời gian
        upcoming_sorted = sorted(
            upcoming, key=lambda d: (d.get("endAt") or d.get("startAt") or "")
        )[:5]
        for d in upcoming_sorted:
            reply += f"  • {d.get('title', 'Môn thi')} – {_fmt_time(d.get('endAt') or d.get('startAt'))}\n"

    if past:
        reply += "- **Một số lịch thi đã diễn ra** (gần nhất):\n"
        past_sorted = sorted(
            past, key=lambda d: (d.get("endAt") or d.get("startAt") or "")
        )[-3:]
        for d in past_sorted:
            reply += f"  • {d.get('title', 'Môn thi')} – {_fmt_time(d.get('endAt') or d.get('startAt'))}\n"

    reply += "Bạn có thể mở trang **Lịch** trong hệ thống để xem đầy đủ tất cả lịch thi theo dạng calendar."

    return reply


def _answer_gpa(message: str, user_id: str) -> str:
    ctx = fetch_full_context(user_id)
    if not ctx:
        return "Không thể lấy dữ liệu kết quả học tập để tính GPA."

    # Nếu trong câu hỏi có nhắc tới một môn cụ thể → trả lời điểm môn đó
    course = find_course_in_text(message, ctx)
    if course:
        code = course["code"]
        name = course["name"]
        results_data = ctx.get("results") or {}
        result = None
        for sem_data in results_data.values():
            if code in sem_data:
                result = sem_data[code]
                break

        if result and "grade" in result:
            grade10 = float(result.get("grade", 0))
            grade4 = four_from_10(grade10)
            status = result.get("status", "chưa rõ")
            if status == "passed":
                return (
                    f"Điểm môn **{name} ({code})** của bạn hiện là **{grade4:.2f}** (hệ 4), trạng thái: **Đậu**."
                )
            elif status == "failed":
                return (
                    f"Điểm môn **{name} ({code})** của bạn hiện là **{grade4:.2f}** (hệ 4), trạng thái: **Trượt**."
                )
            else:
                return (
                    f"Bạn hiện có điểm **{grade4:.2f}** (hệ 4) cho môn **{name} ({code})** (trạng thái: {status})."
                )

        return (
            f"Mình không tìm thấy điểm cho môn **{name} ({code})** trong hệ thống. "
            "Có thể bạn chưa có điểm hoặc dữ liệu chưa được nhập."
        )

    # Nếu không hỏi môn cụ thể → trả lời GPA tổng quát
    # Ưu tiên dùng GPA tích lũy hệ 4 đã được backend tính sẵn (cumGpa4)
    stats_ctx = ctx.get("stats") or {}
    cum_gpa4 = stats_ctx.get("cumGpa4") or {}
    gpa4: Optional[float] = None
    if isinstance(cum_gpa4, dict) and cum_gpa4:
        # Lấy kỳ mới nhất dựa trên số thứ tự trong key (HK1, HK2, ...)
        def _sem_num(k: str) -> int:
            import re as _re
            m = _re.search(r"(\d+)", str(k))
            return int(m.group(1)) if m else 0

        last_key = sorted(cum_gpa4.keys(), key=_sem_num)[-1]
        try:
            gpa4 = float(cum_gpa4[last_key])
        except Exception:
            gpa4 = None

    if gpa4 is not None:
        return (
            f"Điểm trung bình tích lũy hiện tại của bạn khoảng **{gpa4} / 4.0**. "
            "Tiếp tục cố gắng nhé!"
        )

    # Fallback: tự tính lại nếu không có cumGpa4
    stats = _calculate_gpa_and_credits(user_id, ctx)
    gpa = stats.get("gpa")
    if gpa is None:
        return stats.get(
            "error",
            "Không thể tính GPA. Hãy đảm bảo bạn đã có dữ liệu điểm môn học.",
        )

    return f"GPA tích lũy hiện tại của bạn khoảng **{gpa}**. Tiếp tục cố gắng nhé!"


def _answer_semester_gpa(message: str, user_id: str) -> str:
    """
    Trả lời GPA theo từng học kỳ (vd: GPA học kỳ 1, HK2, ...).
    Dùng stats.semGpa4 (hệ 4) từ backend, suy ra học kỳ từ câu hỏi.
    """
    ctx = fetch_full_context(user_id)
    if not ctx:
        return "Không thể lấy dữ liệu để tính điểm trung bình học kỳ."

    stats_ctx = ctx.get("stats") or {}
    sem_gpa4 = stats_ctx.get("semGpa4") or {}

    # Nếu backend có truyền kỳ học hiện tại (do người dùng chọn trên Tiến trình), ưu tiên sử dụng nó
    current_study_sem = str(ctx.get("currentStudySem") or "").strip() or None
    if not isinstance(sem_gpa4, dict) or not sem_gpa4:
        return "Hiện chưa có dữ liệu GPA theo từng học kỳ của bạn."

    import re as _re

    norm = normalize(message)
    m = _re.search(r"(\d+)", norm)
    if not m:
        return "Bạn muốn xem điểm trung bình học kỳ số mấy? (ví dụ: học kỳ 1, HK2, ...)"

    sem_num = int(m.group(1))

    def _sem_num_from_key(k: str) -> int:
        mm = _re.search(r"(\d+)", str(k))
        return int(mm.group(1)) if mm else 0

    target_key = None
    for key in sem_gpa4.keys():
        if _sem_num_from_key(key) == sem_num:
            target_key = key
            break

    if target_key is None:
        return f"Mình không tìm thấy dữ liệu GPA cho học kỳ {sem_num} trong hệ thống."

    try:
        g4 = float(sem_gpa4[target_key])
    except Exception:
        return f"Dữ liệu GPA học kỳ {sem_num} hiện tại không hợp lệ. Bạn thử kiểm tra lại bảng điểm trên trang Kết quả nhé."

    return (
        f"Điểm trung bình **học kỳ {sem_num}** của bạn khoảng **{g4} / 4.0**."
    )


def _answer_best_semester(user_id: str) -> str:
    """
    Trả lời: Học kỳ nào có điểm trung bình cao nhất?
    Dựa trên stats.semGpa4 (hệ 4) từ backend.
    """
    ctx = fetch_full_context(user_id)
    if not ctx:
        return "Không thể lấy dữ liệu để so sánh điểm trung bình các học kỳ."

    stats_ctx = ctx.get("stats") or {}
    sem_gpa4 = stats_ctx.get("semGpa4") or {}
    if not isinstance(sem_gpa4, dict) or not sem_gpa4:
        return "Hiện chưa có dữ liệu GPA theo từng học kỳ của bạn để so sánh."

    import re as _re

    def _sem_num_from_key(k: str) -> int:
        mm = _re.search(r"(\d+)", str(k))
        return int(mm.group(1)) if mm else 0

    # Tìm GPA cao nhất và các học kỳ đạt mức đó
    best_val: float = -1.0
    best_keys: list[str] = []
    for key, val in sem_gpa4.items():
        try:
            g = float(val)
        except Exception:
            continue
        if g > best_val:
            best_val = g
            best_keys = [key]
        elif g == best_val:
            best_keys.append(key)

    if best_val < 0:
        return "Mình không đọc được dữ liệu GPA học kỳ của bạn."

    # Sắp xếp các học kỳ theo số
    best_keys_sorted = sorted(best_keys, key=_sem_num_from_key)
    labels = [f"HK{_sem_num_from_key(k)}" for k in best_keys_sorted]
    if len(labels) == 1:
        return (
            f"Học kỳ có điểm trung bình cao nhất của bạn là **{labels[0]}**, "
            f"khoảng **{best_val} / 4.0**."
        )

    joined = ", ".join(labels)
    return (
        f"Các học kỳ có điểm trung bình cao nhất của bạn là **{joined}**, "
        f"cùng khoảng **{best_val} / 4.0**."
    )


def _answer_debt_courses(user_id: str) -> str:
    """Trả lời ngắn gọn về danh sách môn nợ."""
    ctx = fetch_full_context(user_id)
    if not ctx:
        return "Không thể lấy dữ liệu để kiểm tra môn nợ."
    
    stats = _calculate_gpa_and_credits(user_id, ctx)
    debt_courses = stats.get("debt_courses", [])
    
    if not debt_courses:
        return "Bạn **không nợ môn nào**. Chúc mừng bạn!"
    
    # Liệt kê tất cả môn nợ một cách ngắn gọn
    debt_list = []
    for c in debt_courses:
        grade4 = four_from_10(c.get("grade", 0))
        debt_list.append(f"**{c['name']} ({c['code']})** - {grade4:.2f} (hệ 4), {c['credit']} tín chỉ")
    
    result = f"Bạn đang nợ **{len(debt_courses)}** môn:\n\n"
    result += "\n".join(f"- {item}" for item in debt_list)
    
    return result


def _answer_credits(user_id: str) -> str:
    ctx = fetch_full_context(user_id)
    if not ctx:
        return "Không thể lấy dữ liệu chương trình học và kết quả học tập để kiểm tra tín chỉ."

    stats = _calculate_gpa_and_credits(user_id, ctx)
    total_passed = stats.get("total_credits_passed", 0)
    required = stats.get("required_credits", 0)
    debt_courses = stats.get("debt_courses", [])
    
    if required == 0:
        return "Không tìm thấy thông tin tổng tín chỉ yêu cầu của chuyên ngành bạn."
    
    if debt_courses:
        debt_credits = sum(c["credit"] for c in debt_courses)
        debt_list = ", ".join(
            f"{c['name']} ({c['credit']}TC, {four_from_10(c.get('grade', 0)):.2f})" 
            for c in debt_courses[:3]
        )
        if len(debt_courses) > 3:
            debt_list += f" và {len(debt_courses) - 3} môn khác..."

        return (
            f"Bạn đã tích lũy được **{total_passed}/{required}** tín chỉ cần thiết.\n"
            f"Bạn hiện đang nợ **{len(debt_courses)}** môn học, tổng cộng **{debt_credits}** tín chỉ (chưa đạt).\n"
            f"Các môn nợ tiêu biểu: {debt_list} (hệ 4).\n"
            "Hãy lên kế hoạch học lại để đủ điều kiện ra trường!"
        )
    else:
        remaining_credits = required - total_passed
        if remaining_credits <= 0:
            return (
                f"Tuyệt vời! Bạn đã tích lũy đủ **{required}** tín chỉ cần thiết (hoặc hơn). "
                "Bạn đã sẵn sàng để tốt nghiệp nếu đạt GPA yêu cầu."
            )
        else:
            return (
                f"Bạn đã tích lũy được **{total_passed}/{required}** tín chỉ. "
                f"Bạn cần tích lũy thêm **{remaining_credits}** tín chỉ nữa."
            )


def _answer_graduation(user_id: str) -> str:
    """Đánh giá khả năng ra trường đúng hạn theo hướng "cố vấn học tập" hơn."""
    ctx = fetch_full_context(user_id)
    if not ctx:
        return "Không thể lấy dữ liệu đầy đủ để ước lượng khả năng ra trường của bạn."

    stats = _calculate_gpa_and_credits(user_id, ctx)
    gpa10 = stats.get("gpa")  # GPA hệ 10
    required_gpa_credits = stats.get("required_credits_gpa", 0)
    total_gpa_credits = stats.get("total_credits_gpa", 0)
    total_credits_passed = stats.get("total_credits_passed", 0)
    required_credits = stats.get("required_credits", 0)
    debt_courses = stats.get("debt_courses", [])

    if gpa10 is None or required_credits == 0:
        return stats.get("error", "Không thể ước lượng: Thiếu thông tin về GPA hoặc tổng tín chỉ yêu cầu.")

    # Lấy GPA hệ 4 từ backend hoặc chuyển đổi từ hệ 10
    stats_ctx = ctx.get("stats") or {}
    cum_gpa4 = stats_ctx.get("cumGpa4") or {}

    # Nếu backend có truyền kỳ học hiện tại (do người dùng chọn trên Tiến trình), ưu tiên sử dụng nó
    current_study_sem = str(ctx.get("currentStudySem") or "").strip() or None
    gpa4: Optional[float] = None
    if isinstance(cum_gpa4, dict) and cum_gpa4:
        # Lấy kỳ mới nhất
        def _sem_num(k: str) -> int:
            import re as _re
            m = _re.search(r"(\d+)", str(k))
            return int(m.group(1)) if m else 0
        last_key = sorted(cum_gpa4.keys(), key=_sem_num)[-1] if cum_gpa4 else None
        if last_key:
            try:
                gpa4 = float(cum_gpa4[last_key])
            except Exception:
                gpa4 = None

    # Nếu không có GPA hệ 4 từ backend, chuyển đổi từ hệ 10
    if gpa4 is None:
        gpa4 = four_from_10(gpa10)

    # Giả định: Tốt nghiệp yêu cầu GPA >= 2.0 (hệ 4) và đủ tín chỉ
    MIN_GPA4 = 2.0

    # 1. Kiểm tra GPA và mức rủi ro GPA
    if gpa4 < MIN_GPA4:
        gpa_status = f"GPA tích lũy hiện tại của bạn khoảng {gpa4:.2f}/4.0, đang thấp hơn chuẩn tối thiểu {MIN_GPA4:.2f}."
        gpa_risk = 2
    elif gpa4 < 2.3:
        gpa_status = (
            f"GPA tích lũy hiện tại của bạn khoảng {gpa4:.2f}/4.0, hơi sát ngưỡng tối thiểu "
            "nên bạn cần cẩn thận hơn trong các kỳ tới."
        )
        gpa_risk = 1
    else:
        gpa_status = f"GPA tích lũy hiện tại của bạn khoảng {gpa4:.2f}/4.0, khá an toàn so với ngưỡng tối thiểu."
        gpa_risk = 0

    # 2. Kiểm tra Tín chỉ
    remaining_credits = required_credits - total_credits_passed

    if remaining_credits > 0:
        credits_status = (
            f"Bạn đã tích lũy {total_credits_passed}/{required_credits} tín chỉ. "
            f"Nghĩa là còn thiếu khoảng {remaining_credits} tín chỉ nữa so với yêu cầu tốt nghiệp."
        )
    else:
        credits_status = (
            f"Bạn đã tích lũy {total_credits_passed}/{required_credits} tín chỉ, "
            "tức là đã đủ số tín chỉ tối thiểu theo chương trình."
        )

    # 3. Kiểm tra Môn nợ
    debt_credits = sum(c["credit"] for c in debt_courses)

    if debt_courses:
        debt_status = (
            f"Bạn đang nợ {len(debt_courses)} môn với tổng khoảng {debt_credits} tín chỉ "
            "(cần học lại/thi lại để được công nhận)."
        )
    else:
        debt_status = "Hiện tại bạn không có môn nào bị trượt phải học lại, đây là một lợi thế lớn cho tiến độ tốt nghiệp."

    # Rủi ro nợ môn theo trọng số tín chỉ (vừa mô tả, vừa cho điểm rủi ro)
    if debt_credits == 0:
        debt_risk_text = "rất thấp"
        debt_risk = 0
    elif debt_credits <= 4:
        debt_risk_text = "thấp"
        debt_risk = 1
    elif debt_credits <= 10:
        debt_risk_text = "trung bình"
        debt_risk = 2
    else:
        debt_risk_text = "cao"
        debt_risk = 3

    # 4. Đánh giá tiến độ theo thời gian / số học kỳ dựa trên dữ liệu thực tế
    # Giả định khung chương trình chuẩn: 8 học kỳ chính (4 năm, 2 kỳ/năm)
    SEMESTERS = 8

    stats_ctx = ctx.get("stats") or {}
    sem_gpa4 = stats_ctx.get("semGpa4") or {}

    # Số học kỳ đã thực sự học có tích lũy tín chỉ (dựa trên dữ liệu điểm từng kỳ),
    # tránh trường hợp backend tạo sẵn nhiều key HK nhưng chưa có tín chỉ -> làm lệch tốc độ học/kỳ.
    results_data = ctx.get("results") or {}
    curriculum = ctx.get("curriculum") or {}

    # Map môn học theo code để biết số tín chỉ & có tính vào tín chỉ không
    course_map: Dict[str, Dict[str, Any]] = {}
    for sem in curriculum.get("semesters", []):
        for course in sem.get("courses", []):
            code = course.get("code", "")
            if code:
                course_map[code] = course

    credits_per_sem: Dict[str, float] = {}
    for sem_key, sem_results in results_data.items():
        passed_credits_this_sem = 0.0
        for code, result in sem_results.items():
            course_info = course_map.get(code) or {}
            if not course_info.get("countInCredits", False):
                continue
            credit = float(course_info.get("credit") or 0)
            status = str(result.get("status", "") or "").lower()
            if status == "passed" and credit > 0:
                passed_credits_this_sem += credit
        if passed_credits_this_sem > 0:
            credits_per_sem[str(sem_key)] = passed_credits_this_sem

    if credits_per_sem:
        # Chỉ tính các học kỳ mà sinh viên thực sự có tín chỉ đã qua
        semesters_passed = len(credits_per_sem)
    else:
        # Fallback: nếu chưa tách được theo học kỳ thì ước lượng từ GPA
        if isinstance(sem_gpa4, dict) and sem_gpa4:
            semesters_passed = len(sem_gpa4)
        else:
            semesters_passed = 1

    # Nếu có currentStudySem trong context (từ backend) thì override vị trí hiện tại
    if current_study_sem:
        import re as _re

        m = _re.search(r"(\d+)", current_study_sem)
        if m:
            semesters_passed = max(semesters_passed, int(m.group(1)))

    # Tốc độ học trung bình của riêng sinh viên (tín chỉ/kỳ)
    user_avg_credits_per_sem = (
        total_credits_passed / semesters_passed if semesters_passed > 0 else ideal_avg_credits_per_sem
    )
    if user_avg_credits_per_sem <= 0:
        user_avg_credits_per_sem = ideal_avg_credits_per_sem or required_credits

    # Dự báo số học kỳ cần thêm để hoàn thành tín chỉ nếu giữ nhịp hiện tại
    if remaining_credits > 0 and user_avg_credits_per_sem > 0:
        import math as _math

        semesters_needed = _math.ceil(remaining_credits / user_avg_credits_per_sem)
    else:
        semesters_needed = 0

    # Ước lượng vị trí hiện tại trong chương trình (gần học kỳ mấy)
    current_semester_estimate = semesters_passed
    remaining_semesters_ideal = max(SEMESTERS - current_semester_estimate, 0)

    # Tổng hợp đánh giá mức độ khả năng tốt nghiệp đúng hạn bằng thang rủi ro
    level = "TRUNG BÌNH"
    reasons: list[str] = []

    # Điều kiện rất khả quan (đủ tín chỉ, đủ GPA, không nợ môn)
    if remaining_credits <= 0 and gpa4 >= MIN_GPA4 and debt_credits == 0:
        level = "CAO"
        reasons.append(
            "Bạn đã đủ tín chỉ, GPA đạt yêu cầu và không còn môn nợ, gần như chỉ cần hoàn tất các thủ tục cuối cùng."
        )
    else:
        # Xem xét từng yếu tố: GPA, tiến độ tín chỉ, nợ môn, số kỳ còn lại
        if gpa4 < MIN_GPA4:
            reasons.append(
                "GPA hiện tại đang thấp hơn ngưỡng tối thiểu, bạn cần cải thiện điểm các kỳ tới để không rơi vào vùng rủi ro."
            )

        if remaining_credits > 0:
            reasons.append(
                "Bạn còn thiếu khoảng "
                f"{remaining_credits} tín chỉ. Với nhịp học trung bình hiện tại khoảng "
                f"{user_avg_credits_per_sem:.1f} tín chỉ/kỳ, nếu vẫn giữ đúng nhịp này thì có nguy cơ "
                "phải kéo dài thêm thời gian học ngoài khung chương trình chuẩn. "
                "Để chủ động hơn, bạn có thể cân nhắc đăng ký nhiều tín chỉ hơn mỗi kỳ (trong khả năng chịu tải của mình)."
            )

        if debt_credits > 0:
            reasons.append(
                f"Bạn đang nợ {debt_credits} tín chỉ (mức rủi ro {debt_risk_text}); nếu không xử lý sớm, "
                "môn nợ sẽ chiếm chỗ các môn mới trong các kỳ sau."
            )

        # Nhận xét thêm về nhịp học hiện tại, không đưa ra con số 'còn bao nhiêu kỳ' cụ thể
        if remaining_credits > 0:
            reasons.append(
                f"Nhìn chung, với nhịp hiện tại {user_avg_credits_per_sem:.1f} tín/kỳ, "
                "bạn nên trao đổi với cố vấn học tập để lên kế hoạch đăng ký môn cho các kỳ tới "
                "sao cho vừa đủ tiến độ tốt nghiệp, vừa phù hợp sức học."
            )

        # --- Đánh giá tổng hợp bằng risk_score (kết hợp gợi ý của bạn) ---
        risk_score = 0

        # Rủi ro tín chỉ còn thiếu
        if remaining_credits > 60:
            risk_score += 2
        elif remaining_credits > 40:
            risk_score += 1

        # Rủi ro về số kỳ cần thêm so với số kỳ chuẩn còn lại
        if semesters_needed > remaining_semesters_ideal + 1:
            risk_score += 2
        elif semesters_needed > remaining_semesters_ideal:
            risk_score += 1

        # Rủi ro do GPA và nợ môn
        risk_score += gpa_risk + debt_risk

        if risk_score <= 1:
            level = "CAO"
        elif risk_score <= 4:
            level = "TRUNG BÌNH / KHẢ QUAN"
        else:
            level = "THẤP"

    final_assessment = (
        f"Khả năng tốt nghiệp đúng hạn hiện được đánh giá ở mức: {level}. "
        "Đây là ước lượng dựa trên tiến độ tín chỉ, GPA và số môn nợ hiện tại; "
        "nếu bạn giữ được nhịp học ổn định và xử lý dần các môn nợ thì vẫn có thể chủ động kiểm soát lộ trình ra trường."
    )

    details = "\n".join(f"- {r}" for r in reasons) if reasons else ""

    # Tổng hợp câu trả lời
    reply_parts = [
        "Đánh giá khả năng tốt nghiệp đúng hạn (dựa trên dữ liệu hiện tại):",
        "",
        f"1. Tín chỉ tích lũy: {total_credits_passed}/{required_credits} tín chỉ. {credits_status}",
        f"2. GPA tích lũy: {gpa_status}",
        f"3. Môn nợ: {debt_status}",
    ]
    # Không hiển thị con số 'cần bao nhiêu kỳ' cụ thể để tránh gây hiểu nhầm với tiến trình thực tế từng sinh viên
    if details:
        reply_parts.append("")
        reply_parts.append("Nhận xét chi tiết:")
        reply_parts.append(details)
    reply_parts.append("")
    reply_parts.append(final_assessment)

    return "\n".join(reply_parts)


def _answer_academic_warning(user_id: str) -> str:
    """
    Đánh giá nguy cơ/cấp cảnh báo học tập dựa trên quy định:
    - ĐTB chung học kỳ chính < 1.0
    - ĐTB chung tích lũy dưới các ngưỡng tùy năm: 1.20, 1.40, 1.60, 1.80
    (Ước lượng năm học dựa vào số học kỳ đã có trong kết quả.)
    """
    ctx = fetch_full_context(user_id)
    if not ctx:
        return "Không thể lấy dữ liệu kết quả học tập để đánh giá cảnh báo học tập."

    stats_ctx = ctx.get("stats") or {}
    sem_gpa4 = stats_ctx.get("semGpa4") or {}
    cum_gpa4 = stats_ctx.get("cumGpa4") or {}

    if not isinstance(sem_gpa4, dict) or not isinstance(cum_gpa4, dict) or not sem_gpa4:
        return "Chưa có đủ dữ liệu điểm để đánh giá cảnh báo học tập theo quy định."

    import re as _re

    def _sem_num(key: str) -> int:
        m = _re.search(r"(\d+)", str(key))
        return int(m.group(1)) if m else 0

    # Lấy học kỳ mới nhất
    last_key = sorted(sem_gpa4.keys(), key=_sem_num)[-1]
    try:
        gpa_sem = float(sem_gpa4[last_key])
    except Exception:
        gpa_sem = None

    try:
        gpa_cum = float(cum_gpa4.get(last_key, 0.0))
    except Exception:
        gpa_cum = None

    sem_index = _sem_num(last_key)
    year = (sem_index + 1) // 2 if sem_index > 0 else 1
    if year <= 1:
        threshold = 1.20
    elif year == 2:
        threshold = 1.40
    elif year == 3:
        threshold = 1.60
    else:
        threshold = 1.80

    reasons: list[str] = []
    if gpa_sem is not None and gpa_sem < 1.0:
        reasons.append(
            f"- Điểm trung bình chung học kỳ gần nhất (HK{sem_index}) khoảng {gpa_sem}/4.0, thấp hơn mức 1.0."
        )
    if gpa_cum is not None and gpa_cum < threshold:
        reasons.append(
            f"- Điểm trung bình chung tích lũy khoảng {gpa_cum}/4.0, thấp hơn ngưỡng {threshold}/4.0 cho năm học hiện tại."
        )

    if not reasons:
        return (
            "Theo các ngưỡng cảnh báo học tập (ĐTB học kỳ < 1.0 hoặc ĐTB tích lũy dưới 1.20/1.40/1.60/1.80), "
            "kết quả hiện tại của bạn **chưa rơi vào vùng cảnh báo**. Hãy tiếp tục giữ vững hoặc cải thiện kết quả."
        )

    detail = "\n".join(reasons)
    return (
        "**Đánh giá theo quy định cảnh báo học tập:**\n"
        f"{detail}\n\n"
        "Với các điều kiện trên, kết quả hiện tại của bạn **thuộc vùng có nguy cơ bị cảnh báo học tập mức 1**.\n"
        "Theo quy định, nếu đã bị cảnh báo mức 1 mà các kỳ sau vẫn không cải thiện (tiếp tục vi phạm điều kiện), "
        "bạn có thể bị nâng lên mức 2, rồi mức 3 (mức 3 có thể bị xem xét buộc thôi học). "
        "Bạn nên trao đổi thêm với cố vấn học tập hoặc phòng đào tạo để biết chính xác tình trạng của mình."
    )


def _answer_program_info(_message: str) -> str:
    """
    Trả lời các câu hỏi về thông tin chương trình đào tạo / ngành (tổng quan, chuẩn đầu ra,
    cấu trúc chương trình, nghề nghiệp, học phí, điều kiện tuyển sinh, quy trình nhập học...).
    Hướng người dùng tới trang chính thức của PTIT.
    """
    url = "https://daotao.ptit.edu.vn/chuong-trinh-dao-tao/nganh-cong-nghe-da-phuong-tien/"
    return (
        "Để xem đầy đủ và **chính thức** về **ngành Công nghệ đa phương tiện (PTIT)**, "
        "bao gồm:\n"
        "- **Chương trình đào tạo / Quy trình đào tạo** theo từng năm học, học kỳ.\n"
        "- **Chuẩn đầu ra** và khung năng lực sinh viên sau khi tốt nghiệp.\n"
        "- **Cấu trúc chương trình** (khối kiến thức đại cương, cơ sở ngành, chuyên ngành, đồ án, thực tập...).\n"
        "- **Nghề nghiệp sau khi ra trường**, cơ hội việc làm, định hướng phát triển.\n"
        "- Thông tin về **học phí, điều kiện tuyển sinh, quy chế – quy định đào tạo**, và các **tài liệu chính thức** khác.\n\n"
        f"Bạn nên truy cập trực tiếp trang đào tạo của học viện tại đây:\n- {url}\n\n"
        "Trong hệ thống trợ lý học tập này, mình chủ yếu giúp bạn theo dõi **điểm, GPA, tín chỉ, môn nợ, deadline "
        "và khả năng tốt nghiệp** dựa trên dữ liệu học tập cá nhân của bạn."
    )


def _answer_exam_format(message: str, user_id: Optional[str]) -> str:
    """
    Trả lời về hình thức thi của một môn:
    - Ưu tiên dùng examFormat trong curriculum (nếu có).
    - Nếu không có examFormat, trả lời chung và nhắc kiểm tra đề cương/học phần.
    """
    course_label = ""
    exam_format: Optional[str] = None

    if user_id:
        try:
            ctx = fetch_full_context(user_id)
        except Exception:
            ctx = None
        if ctx:
            course = find_course_in_text(message, ctx)
            if course:
                course_label = f"môn **{course['name']} ({course['code']})** "
                curriculum = ctx.get("curriculum") or {}
                semesters = curriculum.get("semesters") or []
                code = course["code"]
                for sem in semesters:
                    for c in sem.get("courses", []):
                        if str(c.get("code") or "") == code:
                            raw_fmt = c.get("examFormat")
                            if isinstance(raw_fmt, str) and raw_fmt.strip():
                                exam_format = raw_fmt.strip()
                            break
                    if exam_format:
                        break

    prefix = f"Về hình thức thi của {course_label}" if course_label else "Về hình thức thi các môn trong ngành của bạn,"

    if exam_format:
        # Trả lời ngắn gọn, kèm một câu nhắc nhẹ
        return (
            f"{prefix} theo dữ liệu chương trình hiện tại là **{exam_format}**. "
            "Tuy nhiên hình thức thi có thể thay đổi theo giảng viên/kỳ học, nên bạn vẫn nên xem đề cương hoặc nghe thầy cô nhắc lại."
        )

    # Nếu không tìm thấy examFormat trong curriculum, trả lời rất ngắn gọn
    return (
        f"{prefix} hiện mình **không có dữ liệu chính xác** về hình thức thi. "
        "Bạn nên xem đề cương hoặc hỏi trực tiếp giảng viên để biết rõ nhất."
    )


def _answer_non_gpa_courses(user_id: str) -> str:
    """
    Liệt kê các môn học KHÔNG tính vào GPA (countInGpa === false) trong chương trình.
    """
    ctx = fetch_full_context(user_id)
    if not ctx:
        return "Không thể lấy dữ liệu chương trình học để kiểm tra các môn không tính vào GPA."

    curriculum = ctx.get("curriculum") or {}
    semesters = curriculum.get("semesters") or []

    non_gpa: list[dict[str, str]] = []
    for sem in semesters:
        sem_name = str(sem.get("semester") or "")
        for c in sem.get("courses", []):
            if c.get("countInGpa", False) is False:
                non_gpa.append(
                    {
                        "code": str(c.get("code") or ""),
                        "name": str(c.get("name") or ""),
                        "credit": str(c.get("credit") or ""),
                        "semester": sem_name,
                    }
                )

    if not non_gpa:
        return (
            "Trong chương trình hiện tại mình không thấy môn nào được đánh dấu là **không tính vào GPA**. "
            "Có thể tất cả học phần đều được tính vào điểm trung bình hoặc dữ liệu chương trình chưa đầy đủ."
        )

    # Giới hạn hiển thị để tránh quá dài
    shown = non_gpa[:10]
    lines = [
        f"- {it['code']} – {it['name']} ({it['credit']} tín, {it['semester']})"
        for it in shown
    ]
    more = ""
    if len(non_gpa) > len(shown):
        more = f"\n... và còn **{len(non_gpa) - len(shown)}** môn khác không tính vào GPA."

    body = "\n".join(lines)
    return (
        "Theo dữ liệu chương trình học, các môn **không tính vào GPA** của bạn bao gồm:\n"
        f"{body}{more}"
    )


def _answer_strengths_weaknesses(user_id: str) -> str:
    """
    Phân tích điểm mạnh / điểm yếu dựa trên kết quả các môn đã có điểm.
    Ý tưởng đơn giản:
    - Môn mạnh: điểm >= 7.5
    - Môn yếu: điểm < 5.0
    (ngưỡng có thể tinh chỉnh sau nếu cần)
    """
    ctx = fetch_full_context(user_id)
    if not ctx:
        return (
            "Mình không lấy được dữ liệu kết quả học tập để phân tích điểm mạnh điểm yếu của bạn."
        )

    results_data = ctx.get("results") or {}
    curriculum = ctx.get("curriculum") or {}

    if not results_data or not curriculum:
        return (
            "Hiện mình chưa thấy đủ dữ liệu chương trình học hoặc điểm số để phân tích điểm mạnh điểm yếu của bạn."
        )

    # Map thông tin môn từ curriculum
    course_map: Dict[str, Dict[str, Any]] = {}
    for sem in curriculum.get("semesters", []):
        for course in sem.get("courses", []):
            code = str(course.get("code") or "")
            if code:
                course_map[code] = course

    courses_with_grade: List[Dict[str, Any]] = []

    # Nhóm kỹ năng thô theo tên môn (sau khi normalize)
    def _classify_group(course_name: str) -> str:
        name_norm = normalize(course_name)
        # Nghệ thuật – sáng tạo
        art_kw = ["my thuat", "co so tao hinh", "ve", "thiet ke", "do hoa", "illustration"]
        if any(k in name_norm for k in art_kw):
            return "art"
        # Thể chất
        physical_kw = ["giao duc the chat", "the chat", "gdtc"]
        if any(k in name_norm for k in physical_kw):
            return "physical"
        # Kỷ luật / quân sự
        discipline_kw = ["giao duc quoc phong", "gdqp", "quoc phong"]
        if any(k in name_norm for k in discipline_kw):
            return "discipline"
        # Kỹ thuật / logic
        technical_kw = [
            "lap trinh",
            "co so du lieu",
            "cau truc du lieu",
            "toan cao cap",
            "toan roi rac",
            "tin hoc",
            "ky thuat",
        ]
        if any(k in name_norm for k in technical_kw):
            return "technical"
        return "other"

    for sem_data in results_data.values():
        for code, result in sem_data.items():
            course_info = course_map.get(code) or {}

            # Bỏ qua các môn không tính vào GPA (theo chương trình học)
            if not course_info.get("countInGpa", False):
                continue

            name = course_info.get("name") or code
            credit = float(course_info.get("credit") or 0)

            raw_grade = result.get("grade", None)
            if isinstance(raw_grade, (int, float)):
                grade = float(raw_grade)
            else:
                # Không có điểm số rõ ràng thì bỏ qua trong phân tích mạnh/yếu
                continue

            status = str(result.get("status", "") or "").lower()
            group = _classify_group(str(name))
            courses_with_grade.append(
                {
                    "code": code,
                    "name": name,
                    "credit": credit,
                    "grade": grade,
                    "status": status,
                    "group": group,
                }
            )

    if not courses_with_grade:
        return "Mình chưa thấy môn học nào của bạn có điểm số trong hệ thống (các môn tính GPA), nên chưa phân tích được điểm mạnh điểm yếu."

    # --- Thử dùng LLM với prompt chuyên sâu nếu đã cấu hình ---
    try:
        subjects_payload = [
            {
                "name": c["name"],
                "code": c["code"],
                "credit": int(c["credit"]) if c["credit"] else 0,
                "score": round(float(c["grade"]), 2),
            }
            for c in courses_with_grade
        ]

        llm_system_prompt = (
            "Bạn là trợ lý phân tích học tập cho sinh viên.\n"
            "Khi nhận đầu vào là danh sách các môn học và điểm số (trong JSON), hãy phân tích sâu theo cấu trúc sau:\n\n"
            "1. Tổng quan năng lực học tập:\n"
            "- Tóm tắt mức độ đồng đều của điểm.\n"
            "- Nhận xét chung về phong độ.\n"
            "- Nếu không có môn dưới 5 thì nêu rõ 'không có môn yếu tuyệt đối'.\n\n"
            "2. Phân tích theo nhóm kỹ năng (tự phân loại dựa trên tên môn):\n"
            "- Nhóm sáng tạo – mỹ thuật (Mỹ thuật cơ bản, Cơ sở tạo hình, Nhiếp ảnh, Thiết kế, ...).\n"
            "- Nhóm kỷ luật – thể chất (Giáo dục thể chất, Giáo dục quốc phòng, ...).\n"
            "- Nhóm kỹ thuật – công nghệ (Lập trình, Cơ sở dữ liệu, Toán, ...).\n"
            "- Nhóm xã hội – ngôn ngữ (những môn còn lại).\n"
            "→ Từ điểm số rút ra năng lực mạnh/yếu ở từng nhóm.\n\n"
            "3. Phân tích điểm mạnh nổi bật:\n"
            "- Nêu các môn có điểm rất cao (vd >= 9.0) và/hoặc tín chỉ cao.\n"
            "- Giải thích chúng thể hiện ưu điểm gì (tư duy hình khối, kỷ luật, sáng tạo, ...).\n\n"
            "4. Phân tích điểm yếu tương đối:\n"
            "- Không chỉ liệt kê môn điểm thấp, mà so sánh với mặt bằng các môn cùng nhóm.\n"
            "- Phát hiện môn nào thấp hơn mặt bằng nhóm của nó và gợi ý nguyên nhân tiềm năng.\n\n"
            "5. Gợi ý phát triển – định hướng ngành:\n"
            "- Dựa trên nhóm môn mạnh, gợi ý các hướng phù hợp (Thiết kế đồ họa, 3D/Game Art, UI/UX, Multimedia, ...).\n\n"
            "6. Lời khuyên cá nhân hóa:\n"
            "- Gợi ý cách luyện tập/định hướng cụ thể dựa trên nhóm môn mạnh/yếu.\n\n"
            "QUY TẮC:\n"
            "- Giọng văn thân thiện như một người mentor.\n"
            "- Không khen suông; luôn đưa phân tích có lý do.\n"
            "- Hạn chế bullet quá nhiều, có thể dùng một số bullet nhưng vẫn phải có đoạn văn phân tích liền mạch.\n"
            "- Không bịa ra điểm số mới; chỉ sử dụng đúng dữ liệu trong JSON.\n"
            "- Kết bài phải có một đoạn tóm tắt kiểu: 'Bạn phù hợp với hướng ... vì ...'.\n"
        )

        llm_input = (
            "Dưới đây là dữ liệu điểm các môn học của một sinh viên ở dạng JSON.\n"
            "Hãy phân tích theo đúng hướng dẫn trong system prompt.\n\n"
            f"subjects = {json.dumps(subjects_payload, ensure_ascii=False)}"
        )

        llm_reply = ask_general_llm(llm_input, system_prompt=llm_system_prompt)
        # Nếu LLM trả về lỗi cấu hình/mạng thì KHÔNG dùng, fallback sang phân tích nội bộ
        if llm_reply:
            bad_markers = [
                "chưa thấy cấu hình LLM_PROVIDER",
                "Mình đã cố gắng gọi Gemini",
                "Mình đã cố gắng gọi ChatGPT",
                "chưa có GEMINI_API_KEY",
                "chưa có OPENAI_API_KEY",
            ]
            if not any(m in llm_reply for m in bad_markers):
                return llm_reply
    except Exception:
        # Nếu LLM lỗi thì fallback sang phân tích rule-based phía dưới
        pass

    # --- Fallback: phân tích rule-based nếu không dùng được LLM ---

    # Thống kê tổng quát để phân tích "trend"
    # Ưu tiên dùng GPA hệ 4 từ backend nếu có, nếu không thì ước lượng từ điểm hệ 10
    stats_ctx = ctx.get("stats") or {}
    cum_gpa4 = stats_ctx.get("cumGpa4") or {}
    overall_gpa4: Optional[float] = None

    if isinstance(cum_gpa4, dict) and cum_gpa4:
        def _sem_num_for_g4(k: str) -> int:
            import re as _re
            m = _re.search(r"(\d+)", str(k))
            return int(m.group(1)) if m else 0

        last_key = sorted(cum_gpa4.keys(), key=_sem_num_for_g4)[-1]
        try:
            overall_gpa4 = float(cum_gpa4[last_key])
        except Exception:
            overall_gpa4 = None

    # Nếu không có GPA hệ 4 → ước lượng từ điểm hệ 10
    total_credits_for_avg = sum(max(c["credit"], 1.0) for c in courses_with_grade)
    avg10 = (
        sum(c["grade"] * max(c["credit"], 1.0) for c in courses_with_grade)
        / total_credits_for_avg
        if total_credits_for_avg > 0
        else sum(c["grade"] for c in courses_with_grade) / len(courses_with_grade)
    )
    if overall_gpa4 is None:
        overall_gpa4 = round(avg10 / 2.5, 2)  # xấp xỉ chuyển hệ 10 -> hệ 4

    # Ngưỡng "mạnh" / "yếu" tương đối
    STRONG_THRESHOLD = 8.0
    WEAK_THRESHOLD = 6.0

    strong_courses = [c for c in courses_with_grade if c["grade"] >= STRONG_THRESHOLD]
    weak_courses = [c for c in courses_with_grade if c["grade"] < WEAK_THRESHOLD]

    # Sắp xếp để ưu tiên các môn tiêu biểu
    strong_courses_sorted = sorted(
        strong_courses, key=lambda x: (-x["grade"], -x["credit"])
    )[:5]
    weak_courses_sorted = sorted(
        weak_courses, key=lambda x: (x["grade"], -x["credit"])
    )[:5]

    # Best course để nói "điểm mạnh nổi bật"
    best_course = max(courses_with_grade, key=lambda x: x["grade"])

    # Thống kê theo nhóm kỹ năng
    group_stats: Dict[str, Dict[str, Any]] = {}
    for c in courses_with_grade:
        g = c["group"]
        if g not in group_stats:
            group_stats[g] = {
                "sum": 0.0,
                "credits": 0.0,
                "courses": [],
            }
        w = max(c["credit"], 1.0)
        group_stats[g]["sum"] += c["grade"] * w
        group_stats[g]["credits"] += w
        group_stats[g]["courses"].append(c)

    def _group_avg(g: str) -> Optional[float]:
        st = group_stats.get(g)
        if not st or st["credits"] <= 0:
            return None
        return st["sum"] / st["credits"]

    art_avg = _group_avg("art")
    physical_avg = _group_avg("physical")
    discipline_avg = _group_avg("discipline")
    technical_avg = _group_avg("technical")

    lines: List[str] = []

    # 1. Tổng quan
    lines.append("📌 **Tổng quan về năng lực học tập hiện tại**")
    if overall_gpa4 is not None:
        lines.append(
            f"\nGPA tích lũy (ước tính) hiện tại của bạn khoảng **{overall_gpa4:.2f} / 4.0** "
            f"(xấp xỉ ~{avg10:.1f}/10 dựa trên các môn tính vào GPA)."
        )
    else:
        lines.append(
            f"\nNhìn vào các điểm số đã có (các môn tính vào GPA), điểm trung bình hệ 10 của bạn đang ở quanh **{avg10:.1f}/10**."
        )

    # 2. Phân tích theo nhóm kỹ năng
    lines.append("\n📌 **Nhóm kỹ năng nổi bật**")
    explained_any_group = False

    if art_avg is not None and art_avg >= overall_avg:
        explained_any_group = True
        top_art = sorted(
            group_stats["art"]["courses"], key=lambda x: (-x["grade"], -x["credit"])
        )[:2]
        examples = ", ".join(f"{c['name']} ({c['code']})" for c in top_art)
        art_avg4 = four_from_10(art_avg)
        lines.append(
            f"- Nhóm **nghệ thuật – sáng tạo** đang rất nổi bật (trung bình khoảng {art_avg4:.2f}, hệ 4), "
            f"đặc biệt ở các môn như {examples}. Điều này cho thấy bạn có thẩm mỹ tốt, khả năng quan sát và tư duy bố cục ổn."
        )

    if (physical_avg is not None and physical_avg >= overall_avg) or (
        discipline_avg is not None and discipline_avg >= overall_avg
    ):
        explained_any_group = True
        lines.append(
            "- Nhóm **thể chất / kỷ luật** (GDTC, GDQP nếu có) cho thấy bạn khá kỷ luật, "
            "chịu khó rèn luyện và có khả năng duy trì nhịp học tập ổn định."
        )

    if technical_avg is not None:
        technical_avg4 = four_from_10(technical_avg)
        if technical_avg >= overall_avg:
            explained_any_group = True
            lines.append(
                f"- Các môn **kỹ thuật / logic** của bạn đang ở mức tốt (khoảng {technical_avg4:.2f}, hệ 4), "
                "gợi ý tư duy phân tích và xử lý vấn đề khá ổn."
            )
        else:
            explained_any_group = True
            lines.append(
                f"- Các môn **kỹ thuật / logic** hiện đang thấp hơn mặt bằng chung (khoảng {technical_avg4:.2f}, hệ 4), "
                "nếu sau này vào sâu các môn lập trình / kỹ thuật, bạn nên để ý cải thiện dần."
            )

    if not explained_any_group:
        lines.append(
            "- Dữ liệu hiện tại chưa đủ đa dạng để chia rõ theo nhóm kỹ năng, nhưng tổng thể bạn đang giữ phong độ khá ổn."
        )

    # 3. Điểm mạnh nổi bật (mức môn học)
    lines.append("\n📌 **Điểm mạnh nổi bật theo từng môn**")
    if strong_courses_sorted:
        lines.append("Các môn có điểm cao nhất (mạnh nhất hiện tại):")
        for c in strong_courses_sorted:
            grade4 = four_from_10(c['grade'])
            lines.append(
                f"- **{c['name']} ({c['code']})** ~ **{grade4:.2f}** (hệ 4), {int(c['credit']) if c['credit'] else 0} tín chỉ."
            )
        best_grade4 = four_from_10(best_course['grade'])
        lines.append(
            f"\nMôn nổi bật nhất hiện tại là **{best_course['name']} ({best_course['code']})** "
            f"với điểm **{best_grade4:.2f}** (hệ 4) – đây có thể xem là 'điểm mạnh chủ lực' của bạn."
        )
    else:
        lines.append(
            "Hiện mình chưa thấy môn nào vượt ngưỡng mạnh rõ ràng (>= 8.0), nhưng điểm của bạn khá đồng đều."
        )

    # 4. Điểm yếu tương đối / khu vực cần để ý
    lines.append("\n📌 **Những khu vực nên chú ý thêm (điểm yếu tương đối)**")
    if weak_courses_sorted:
        lines.append(
            "Một vài môn có điểm thấp hơn mức 6.0 – đây là những chỗ bạn nên dành thêm thời gian:"
        )
        for c in weak_courses_sorted:
            grade4 = four_from_10(c['grade'])
            lines.append(
                f"- {c['name']} ({c['code']}) ~ **{grade4:.2f}** (hệ 4), {int(c['credit']) if c['credit'] else 0} tín chỉ."
            )
        lines.append(
            "Bạn có thể xem lại cách học các môn này (ôn lại nền tảng, hỏi thêm thầy/cô, làm nhiều bài tập nhỏ...)."
        )
    else:
        # Không có môn yếu tuyệt đối, nhưng có thể có 'yếu tương đối' so với nhóm mạnh
        # Tìm môn nghệ thuật thấp hơn trung bình nhóm nghệ thuật (nếu có) như ví dụ bạn đưa ra
        relative_notes: List[str] = []
        if art_avg is not None and "art" in group_stats:
            for c in group_stats["art"]["courses"]:
                if c["grade"] < art_avg:
                    grade4 = four_from_10(c['grade'])
                    art_avg4 = four_from_10(art_avg)
                    relative_notes.append(
                        f"- **{c['name']} ({c['code']})** thấp hơn một chút so với mặt bằng các môn tạo hình khác "
                        f"(khoảng {grade4:.2f} so với trung bình nhóm ~{art_avg4:.2f}, hệ 4)."
                    )
        if relative_notes:
            lines.append(
                "Bạn không có môn nào quá yếu (dưới 6.0), nhưng trong nhóm mạnh vẫn có vài chỗ cần cân bằng thêm:"
            )
            lines.extend(relative_notes)
            lines.append(
                "Điều này cho thấy bạn có nền tảng tốt, chỉ cần tinh chỉnh thêm kỹ thuật (ví dụ: phối màu, chi tiết, hoặc kỹ thuật vẽ chuyên sâu)."
            )
        else:
            lines.append(
                "Hiện mình không thấy môn nào thực sự yếu; các điểm số của bạn khá an toàn. "
                "Quan trọng là duy trì nhịp học và dần nâng chuẩn của bản thân lên cao hơn."
            )

    # 5. Gợi ý định hướng & cách phát triển (giọng mentor)
    lines.append("\n📌 **Gợi ý định hướng & cách phát triển**")
    suggestions: List[str] = []
    if art_avg is not None and (art_avg >= overall_avg or art_avg >= 8.0):
        suggestions.append(
            "Bạn có thiên hướng khá rõ về **mảng nghệ thuật – tạo hình**. "
            "Các hướng như **Thiết kế đồ họa, 3D, Game Art, UI/UX** rất phù hợp với profile hiện tại của bạn."
        )
        suggestions.append(
            "Nếu muốn đi sâu hơn, bạn có thể luyện thêm về **color study, anatomy cơ bản, composition nâng cao**, "
            "kết hợp xem thêm portfolio của các designer để mở rộng gu thẩm mỹ."
        )
    if physical_avg is not None or discipline_avg is not None:
        suggestions.append(
            "Điểm GDTC / GDQP tốt cho thấy bạn có **tính kỷ luật và khả năng bám nhịp dài hơi**, "
            "đây là lợi thế lớn khi làm các dự án Multimedia đòi hỏi nhiều giờ chỉnh sửa, render, tinh chỉnh chi tiết."
        )
    if not suggestions:
        suggestions.append(
            "Hiện dữ liệu chủ yếu cho thấy bạn đang giữ phong độ ổn định. "
            "Bạn có thể dần thử nghiệm các môn chuyên ngành (kỹ thuật hơn hoặc sáng tạo hơn) để xem mình hợp hướng nào."
        )
    lines.extend(f"- {s}" for s in suggestions)

    return "\n".join(lines)
def _answer_course(message: str, user_id: str) -> str:
    ctx = fetch_full_context(user_id)
    if not ctx:
        return "Không thể lấy dữ liệu chương trình học để tra cứu môn học."

    course = find_course_in_text(message, ctx)
    
    if not course:
        return "Mình không tìm thấy môn học nào trong câu hỏi của bạn. Bạn muốn hỏi về môn nào?"

    code = course["code"]
    name = course["name"]
    
    # Tìm kiếm kết quả học tập của môn đó
    # Trong context, kết quả được đặt ở field "results"
    results_data = ctx.get("results") or {}
    result = None
    for sem_data in results_data.values():
        if code in sem_data:
            result = sem_data[code]
            break

    if result and "grade" in result:
        grade10 = float(result.get("grade", 0))
        grade4 = four_from_10(grade10)
        status = result.get("status", "chưa rõ")
        
        if status == "passed":
            return f"Kết quả môn **{name} ({code})** của bạn là **Đạt** với điểm **{grade4:.2f}** (hệ 4). Chúc mừng bạn!"
        elif status == "failed":
            return f"Kết quả môn **{name} ({code})** của bạn là **Trượt** với điểm **{grade4:.2f}** (hệ 4). Bạn cần đăng ký học lại môn này."
        else:
            return f"Bạn đã có điểm **{grade4:.2f}** (hệ 4) cho môn **{name} ({code})**."
    else:
        return f"Môn **{name} ({code})** chưa có điểm trong hệ thống. Hãy kiểm tra lại lịch học hoặc deadline của môn này nhé."


def handle_chat(text: str, user_id: Optional[str] = None) -> str:
    """Xử lý câu hỏi của người dùng, dùng Intent Classification và tra cứu dữ liệu."""

    norm_text = normalize(text)
    text_l = text.lower()
    state = _get_session_state(user_id)
    last_intent = state.get("last_intent")

    # Ưu tiên đặc biệt: câu hỏi phân tích điểm mạnh / điểm yếu môn học
    strengths_kw_early = [
        "diem manh",
        "diem yeu",
        "manh yeu",
        "mon nao manh",
        "mon nao yeu",
        "mon nao tot",
        "mon nao kem",
        "hoc luc manh",
        "hoc luc yeu",
        "phan tich hoc luc",
        "phan tich diem manh",
        "phan tich diem yeu",
    ]
    if any(k in norm_text for k in strengths_kw_early):
        if not user_id:
            return (
                "Mình cần user_id để phân tích điểm mạnh điểm yếu môn học của bạn từ dữ liệu hệ thống."
            )
        state["last_intent"] = "strengths_weaknesses"
        return _answer_strengths_weaknesses(user_id)

    intent = predict_intent(norm_text)

    # Nếu intent model không chắc nhưng user dùng các cụm "còn gì nữa", "nữa không"...
    # thì fallback về intent trước đó trong cùng session.
    if intent is None and last_intent:
        follow_kw = ["con gi nua", "con gi", "them gi", "nua khong", "nua ko", "tiep tuc", "tieptuc", "nua k"]
        if any(k in norm_text for k in follow_kw):
            intent = last_intent
    
    # Nếu Intent Classification không chắc, dùng rule-based thô (Fallbacks)
    # Ưu tiên câu hỏi về cảnh báo học tập / tốt nghiệp trước để tránh bị bắt nhầm sang deadline

    # Câu hỏi về chương trình đào tạo / ngành (tổng quan, chuẩn đầu ra, cấu trúc, nghề nghiệp, học phí, tuyển sinh...)
    program_kw = [
        "chuong trinh dao tao",
        "chuong trinh dao tao cua nganh",
        "chuong trinh dao tao nganh",
        "quy trinh dao tao",
        "quy trinh dao tao nganh",
        "cong nghe da phuong tien",
        "nganh cong nghe da phuong tien",
        "tong quan nganh",
        "chuan dau ra",
        "cau truc chuong trinh",
        "nghe nghiep",
        "hoc phi",
        "dieu kien tuyen sinh",
        "quy trinh nhap hoc",
        "tai lieu dao tao",
    ]
    if any(k in norm_text for k in program_kw) or (
        "dao tao" in norm_text and ("chuong trinh" in norm_text or "quy trinh" in norm_text)
    ):
        # Các câu hỏi này tốt nhất nên xem trực tiếp trên trang PTIT
        return _answer_program_info(text)

    # Lịch thi (ngày/giờ thi): ưu tiên bắt trước khi xử lý hình thức thi
    if "thi" in norm_text and (
        "lich thi" in norm_text
        or "lich" in norm_text
        or "ngay thi" in norm_text
        or "ngay nao" in norm_text
        or "bao gio" in norm_text
        or "gio thi" in norm_text
        or "giờ thi" in text_l
    ):
        if not user_id:
            return "Mình cần user_id để xem lịch thi của bạn."
        state["last_intent"] = "exam_schedule"
        return _answer_exam_schedule(text, user_id)

    # Hình thức thi (tự luận, trắc nghiệm, vấn đáp, bài tập lớn, thực hành...)
    exam_kw = [
        "hinh thuc thi",
        "thi cuoi ky",
        "thi cuoi ki",
        "thi cuoi",
        "thi the nao",
        "thi nhu the nao",
        "thi kieu gi",
        "thi mon nay ra sao",
        "thi mon",
        "bai tap lon hay thi",
    ]
    if any(k in norm_text for k in exam_kw):
        return _answer_exam_format(text, user_id)

    # Cảnh báo học tập
    warning_kw = ["canh bao hoc tap", "cảnh báo học tập", "muc canh bao", "mức cảnh báo"]
    if any(k in norm_text for k in warning_kw):
        if not user_id:
            return "Mình cần user_id để đánh giá nguy cơ cảnh báo học tập của bạn."
        state["last_intent"] = "warning"
        return _answer_academic_warning(user_id)

    # Tốt nghiệp đúng hạn
    graduation_kw = ["ra truong", "tot nghiep", "tot nghiep dung han", "ra truong dung han"]
    if intent == "graduation" or any(k in norm_text for k in graduation_kw):
        if not user_id:
            return "Mình cần user_id để ước lượng khả năng ra trường đúng hạn của bạn."
        state["last_intent"] = "graduation"
        return _answer_graduation(user_id)

    # Deadline: chỉ match khi có từ khóa rõ ràng về hạn nộp/deadline, tránh bắt nhầm "đúng hạn"
    deadline_kw = ["deadline", "han nop", "han nop bai", "han nop bai tap", "nop bai"]
    if intent == "deadline" or any(k in norm_text for k in deadline_kw):
        if not user_id:
            return "Mình cần user_id để tra cứu deadline của bạn."
        state["last_intent"] = "deadline"
        return _answer_deadline(text, user_id)

    # Hỏi về môn nợ cụ thể (ưu tiên trả lời ngắn gọn)
    debt_kw = [
        "no mon nao",           # nợ môn nào
        "no mon gi",            # nợ môn gì
        "dang no mon",          # đang nợ môn
        "mon nao no",           # môn nào nợ
        "mon gi no",            # môn gì nợ
        "danh sach mon no",     # danh sách môn nợ
        "mon hoc lai",          # môn học lại
    ]
    if any(k in norm_text for k in debt_kw):
        if not user_id:
            return "Mình cần user_id để kiểm tra môn nợ của bạn."
        state["last_intent"] = "debt"
        return _answer_debt_courses(user_id)
    
    # Hỏi về tín chỉ / môn nợ (câu hỏi chung)
    credits_kw_norm = [
        "no mon",               # nợ môn
        "thieu tin chi",        # thiếu tín chỉ
        "tin chi",              # tín chỉ
        "bao nhieu tin",        # bao nhiêu tín
        "tich luy duoc bao tin",  # tích lũy được bao tín
        "tich luy duoc bao nhieu tin",
        "tich luy bao nhieu tin",
    ]
    if intent == "credits" or any(k in norm_text for k in credits_kw_norm):
        if not user_id:
            return "Mình cần user_id để kiểm tra môn nợ và tín chỉ của bạn."
        state["last_intent"] = "credits"
        return _answer_credits(user_id)

    # Phân tích điểm mạnh / điểm yếu các môn học
    strengths_kw = [
        "diem manh",
        "diem yeu",
        "manh yeu",
        "mon nao manh",
        "mon nao yeu",
        "mon nao tot",
        "mon nao kem",
        "hoc luc manh",
        "hoc luc yeu",
        "phan tich hoc luc",
        "phan tich diem manh",
        "phan tich diem yeu",
    ]
    if any(k in norm_text for k in strengths_kw):
        if not user_id:
            return (
                "Mình cần user_id để phân tích điểm mạnh điểm yếu môn học của bạn từ dữ liệu hệ thống."
            )
        state["last_intent"] = "strengths_weaknesses"
        return _answer_strengths_weaknesses(user_id)

    # Hỏi về các môn không tính vào GPA
    if "gpa" in norm_text and (
        "khong tinh" in norm_text
        or "ko tinh" in norm_text
        or "khong duoc tinh" in norm_text
        or "khong tinh vao" in norm_text
    ):
        if not user_id:
            return "Mình cần user_id để xem danh sách môn không tính vào GPA của bạn."
        state["last_intent"] = "non_gpa_courses"
        return _answer_non_gpa_courses(user_id)

    # Hỏi về GPA học kỳ cụ thể (HK1, học kỳ 2, ...) hoặc học kỳ có GPA cao nhất
    import re as _re  # local import để tránh phụ thuộc vòng
    sem_pattern = _re.search(r"(hk|hoc ky|hoc ki)\s*\d+", norm_text)

    # "Học kỳ nào điểm cao nhất / GPA cao nhất"
    best_sem_kw = ["cao nhat", "tot nhat", "diem cao nhat", "gpa cao nhat"]
    sem_kw = ["hoc ky", "hoc ki", "hk"]
    if any(k in norm_text for k in best_sem_kw) and any(k in norm_text for k in sem_kw):
        if not user_id:
            return "Mình cần user_id để so sánh GPA các học kỳ của bạn."
        state["last_intent"] = "best_semester"
        return _answer_best_semester(user_id)

    # "GPA học kỳ 1", "điểm trung bình HK2", ...
    if ("gpa" in norm_text or "diem" in norm_text or "diem trung binh" in norm_text) and sem_pattern:
        if not user_id:
            return "Mình cần user_id để tra GPA học kỳ của bạn từ hệ thống."
        state["last_intent"] = "semester_gpa"
        return _answer_semester_gpa(text, user_id)

    # Hỏi về GPA / điểm nói chung (tích lũy hoặc điểm môn)
    if intent == "gpa" or "gpa" in norm_text or "điểm" in text_l or "diem" in norm_text:
        # Nếu câu đã nhắc rõ "điểm mạnh / điểm yếu" thì ưu tiên phân tích mạnh/yếu,
        # không trả lời GPA chung nữa.
        strengths_kw_inline = [
            "diem manh",
            "diem yeu",
            "manh yeu",
            "phan tich hoc luc",
            "phan tich diem manh",
            "phan tich diem yeu",
        ]
        if any(k in norm_text for k in strengths_kw_inline):
            if not user_id:
                return (
                    "Mình cần user_id để phân tích điểm mạnh điểm yếu môn học của bạn từ dữ liệu hệ thống."
                )
            state["last_intent"] = "strengths_weaknesses"
            return _answer_strengths_weaknesses(user_id)

        if not user_id:
            return "Mình cần user_id để tra GPA/điểm của bạn từ hệ thống."
        state["last_intent"] = "gpa"
        return _answer_gpa(text, user_id)

    if intent == "course" or "môn" in text or "mon" in text or "học gì" in text or "hoc gi" in text:
        if not user_id:
            return "Mình cần user_id để tra cứu thông tin môn học của bạn."
        state["last_intent"] = "course"
        return _answer_course(text, user_id)

    # Fallback: nếu chưa bắt được intent rõ ràng nhưng câu trùng tên một môn trong chương trình,
    # thì xem như đang hỏi về môn đó (điểm/trạng thái môn).
    if user_id:
        try:
            ctx_fallback = fetch_full_context(user_id)
        except Exception:
            ctx_fallback = None
        if ctx_fallback:
            course_fb = find_course_in_text(text, ctx_fallback)
            if course_fb:
                state["last_intent"] = "course"
                return _answer_course(text, user_id)
        
    # --- Trả lời chung ---
    
    # Xử lý các câu hỏi chung, chào hỏi
    greetings = ["chào", "chao", "hello", "hi", "xin chào"]
    if any(g in norm_text for g in greetings):
        # Thử lấy tên người dùng để chào cho thân thiện
        name = _get_user_name(user_id) if user_id else None
        if name:
            return (
                f"Chào {name}! Mình là Trợ lý Sinh viên. "
                "Bạn muốn hỏi về GPA, deadline, tín chỉ hay khả năng tốt nghiệp của mình không?"
            )
        return (
            "Chào bạn! Mình là Trợ lý Sinh viên. "
            "Bạn muốn hỏi về GPA, deadline, tín chỉ hay khả năng tốt nghiệp của mình không?"
        )
        
    # Các câu trả lời rất ngắn kiểu "có", "ok", "được", ... sau lời gợi ý của bot
    short_yes = ["co", "ok", "oke", "dc", "duoc", "vang", "uh", "uhm", "uk"]
    if norm_text.strip() in short_yes:
        return (
            "Bạn có thể nói rõ hơn giúp mình nhé: "
            "bạn muốn hỏi **GPA, tín chỉ, deadline, thông tin môn học hay khả năng tốt nghiệp**?\n"
            "Ví dụ: \"GPA hiện tại của t là bao nhiêu?\", \"t còn nợ môn nào?\" hoặc "
            "\"hình thức thi môn Toán cao cấp 1 là gì?\""
        )
        
    general_questions = ["bạn là ai", "ban la ai", "giúp tôi", "giup toi"]
    if any(q in norm_text for q in general_questions):
        return (
            "Mình là Trợ lý Sinh viên, được thiết kế để giúp bạn quản lý tiến độ học tập. "
            "Mình có thể trả lời các câu hỏi về GPA, tín chỉ, deadline, thông tin môn học "
            "và ước lượng khả năng tốt nghiệp của bạn. Với các câu hỏi kiến thức chung "
            "(lập trình, kỹ năng, định hướng nghề nghiệp, v.v.) mình sẽ nhờ thêm một mô hình AI khác hỗ trợ."
        )

    # Cuối cùng: thử nhờ LLM tổng quát nếu đã cấu hình (ChatGPT / Gemini)
    llm_reply = ask_general_llm(text)
    if llm_reply:
        return llm_reply

    return (
        "Mình xin lỗi, mình chưa hiểu rõ câu hỏi của bạn. Mình chủ yếu hỗ trợ các câu hỏi liên quan đến: "
        "GPA, tín chỉ, deadline, thông tin môn học và ước lượng khả năng tốt nghiệp. "
        "Nếu bạn muốn hỏi kiến thức chung, bạn có thể bật cấu hình LLM_PROVIDER (OpenAI/Gemini) cho hệ thống."
    )