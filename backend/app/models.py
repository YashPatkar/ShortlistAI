from datetime import datetime
from sqlmodel import SQLModel, Field


class Resume(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    file_path: str
    extracted_text: str
    updated_at: datetime = Field(default_factory=datetime.utcnow)
