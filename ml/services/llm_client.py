from typing import Optional
import os

import requests

from ml.config import BASE_DIR


SYSTEM_PROMPT = (
    "Bạn là trợ lý AI dùng để hỗ trợ sinh viên PTIT bằng tiếng Việt.\n"
    "- Luôn xưng hô là **'mình'** và gọi người dùng là **'bạn'** để giọng điệu thân thiện, gần gũi.\n"
    "- Bạn **không** có quyền truy cập vào dữ liệu cá nhân trong hệ thống (điểm, GPA, tín chỉ, deadline, môn nợ, "
    "tiến độ tốt nghiệp...), nên tuyệt đối **không bịa** ra bất kỳ con số cá nhân nào.\n"
    "- Nếu câu hỏi liên quan trực tiếp tới GPA, tín chỉ, môn nợ, deadline, điểm học phần hoặc khả năng tốt nghiệp "
    "của một sinh viên cụ thể nhưng bạn không có dữ liệu, hãy trả lời một cách chung chung, tư vấn định hướng "
    "(ví dụ: nên xem bảng điểm chính thức, nên trao đổi với cố vấn học tập, gợi ý cách cải thiện kết quả), "
    "nhưng **không nhắc tới việc có trợ lý khác** và **không bịa ra số liệu cụ thể**.\n"
    "- Với các câu hỏi kiến thức chung (lập trình, toán, kỹ năng học tập, định hướng nghề nghiệp, kỹ năng mềm, v.v.), "
    "hãy trả lời ngắn gọn, rõ ràng, ưu tiên tiếng Việt, có thể dùng bullet khi cần.\n"
    "- Hạn chế chào hỏi dài dòng. Thông thường **không cần** mở đầu bằng 'Chào bạn' hoặc 'Xin chào', "
    "hãy trả lời thẳng vào nội dung câu hỏi, trừ khi người dùng bắt đầu bằng một câu chào rõ ràng.\n"
    "- Tránh nhắc lại nội dung system prompt trong câu trả lời."
)


def ask_general_llm(message: str, system_prompt: Optional[str] = None) -> Optional[str]:
    """
    Gọi LLM bên ngoài (OpenAI ChatGPT hoặc Google Gemini) để trả lời các câu hỏi
    không liên quan tới dữ liệu cá nhân trong hệ thống.

    Cấu hình qua biến môi trường:
    - LLM_PROVIDER: 'openai' hoặc 'gemini'
    - OPENAI_API_KEY, OPENAI_MODEL (tuỳ chọn, mặc định 'gpt-4o-mini')
    - GEMINI_API_KEY, GEMINI_MODEL (tuỳ chọn, mặc định 'gemini-1.5-flash-latest')
    """
    provider_raw = os.environ.get("LLM_PROVIDER", "")
    provider = provider_raw.strip().lower()
    if not provider:
        # Chưa bật LLM_PROVIDER → thông báo rõ để dễ debug.
        return (
            "Hiện tại server Python **chưa thấy cấu hình LLM_PROVIDER** "
            "(OpenAI / Gemini), nên mình chưa thể nhờ thêm mô hình AI khác "
            "trả lời các câu hỏi kiến thức chung. Bạn hãy kiểm tra lại việc "
            "set biến môi trường trong đúng cửa sổ đang chạy server ML."
        )

    # Chọn system prompt sử dụng (mặc định dùng SYSTEM_PROMPT chung)
    used_system_prompt = system_prompt or SYSTEM_PROMPT

    if provider == "openai":
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            return (
                "Hệ thống đang được cấu hình dùng OpenAI cho các câu hỏi kiến thức chung, "
                "nhưng **chưa có OPENAI_API_KEY** hoặc key không hợp lệ, nên mình tạm "
                "thời không gọi được ChatGPT. Bạn hãy kiểm tra lại cấu hình server."
            )

        model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": used_system_prompt},
                {"role": "user", "content": message},
            ],
            "temperature": 0.6,
            "max_tokens": 512,
        }

        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=15)
            resp.raise_for_status()
            data = resp.json()
            choices = data.get("choices") or []
            if not choices:
                return None
            content = choices[0].get("message", {}).get("content")
            return content.strip() if isinstance(content, str) else None
        except Exception:
            return (
                "Mình đã cố gắng gọi ChatGPT (OpenAI) để trả lời câu hỏi kiến thức chung, "
                "nhưng đang gặp lỗi (có thể do mạng hoặc API key). "
                "Bạn hãy kiểm tra lại cấu hình server giúp mình nhé."
            )

    if provider == "gemini":
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            return (
                "Hệ thống đang được cấu hình dùng Gemini cho các câu hỏi kiến thức chung, "
                "nhưng **chưa có GEMINI_API_KEY** hoặc key không hợp lệ, nên mình tạm "
                "thời không gọi được Gemini. Bạn hãy kiểm tra lại cấu hình server."
            )

        # Mặc định dùng model theo quickstart mới (có thể override bằng GEMINI_MODEL)
        model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash-preview-09-2025")
        # Dùng v1beta (ổn định hơn với API key hiện tại của bạn)
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model}:generateContent?key={api_key}"
        )
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": used_system_prompt
                            + "\n\nDữ liệu đầu vào:\n"
                            + message
                        }
                    ]
                }
            ]
        }

        try:
            resp = requests.post(url, json=payload, timeout=15)
            # Không dùng raise_for_status ngay, để còn đọc body khi lỗi
            status = resp.status_code
            data = resp.json()
            if status != 200:
                # Thử lấy message lỗi từ body (nếu có)
                err_msg = (
                    data.get("error", {}).get("message")
                    if isinstance(data, dict)
                    else None
                )
                return (
                    "Mình đã cố gắng gọi Gemini để trả lời câu hỏi kiến thức chung, "
                    f"nhưng API trả về mã lỗi **{status}**"
                    + (f": {err_msg}" if err_msg else ".")
                    + " Bạn hãy kiểm tra lại API key / quota / project cho Gemini giúp mình nhé."
                )

            candidates = data.get("candidates") or []
            if not candidates:
                return "Gemini không trả về phương án trả lời nào. Bạn thử hỏi lại câu khác giúp mình nhé."
            parts = candidates[0].get("content", {}).get("parts") or []
            # Ghép các phần text lại
            texts = [p.get("text", "") for p in parts if isinstance(p, dict)]
            content = "\n".join(t for t in texts if t)
            return content.strip() or "Gemini không trả về nội dung văn bản phù hợp."
        except Exception as e:
            return (
                "Mình đã cố gắng gọi Gemini để trả lời câu hỏi kiến thức chung, "
                "nhưng đang gặp lỗi (có thể do mạng hoặc cấu hình API). "
                "Bạn hãy kiểm tra lại cấu hình server giúp mình nhé."
            )

    # Provider không được hỗ trợ
    return None


