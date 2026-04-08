import os
from sqlmodel import SQLModel, create_engine, Session

# Priority mapping: Persistent Volume -> Local Drive
if os.environ.get("RAILWAY_ENVIRONMENT") or os.path.exists("/app/data"):
    default_db = "sqlite:////app/data/mocksewa.db"
else:
    default_db = "sqlite:///./mocksewa.db"

sqlite_url = os.getenv("DATABASE_URL", default_db)
engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
