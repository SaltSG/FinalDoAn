from typing import Optional, Dict, Any, List

import requests

from ml.config import BACKEND_BASE


def _safe_get(path: str, params: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
  """Hàm trợ giúp thực hiện cuộc gọi GET API một cách an toàn."""
  url = f"{BACKEND_BASE}{path}"
  try:
      resp = requests.get(url, params=params, timeout=3)
      if not resp.ok:
          return None
      return resp.json()
  except Exception:
      # Log lỗi nếu cần, nhưng trả về None để logic chính xử lý
      return None


def fetch_deadlines_for_user(user_id: str) -> Optional[Dict[str, Any]]:
    return _safe_get("/api/deadlines", params={"userId": user_id})


def fetch_results_for_user(user_id: str) -> Optional[Dict[str, Any]]:
    return _safe_get("/api/results", params={"userId": user_id})


def fetch_full_context(user_id: str) -> Optional[Dict[str, Any]]:
    """Lấy toàn bộ ngữ cảnh cần thiết cho chatbot (curriculum, results, deadlines, user)."""
    return _safe_get("/api/chatbot/context", params={"userId": user_id})


def fetch_user_info(user_id: str) -> Optional[Dict[str, Any]]:
    """Lấy thông tin người dùng (chủ yếu là tên)."""
    data = _safe_get("/api/users/name", params={"userId": user_id})
    if data and "name" in data:
        return data
    return None