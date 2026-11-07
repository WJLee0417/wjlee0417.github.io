# Upstream notebook code cell 1 (zero-based)
import os
from pathlib import Path
import folium
import pandas as pd
import pymysql
from pyproj import Transformer
from sklearn.metrics.pairwise import cosine_similarity

ROOT = Path.cwd().parent if Path.cwd().name == 'notebooks' else Path.cwd()
DATA_MODE = os.getenv('DATA_MODE', 'demo').lower()
DATA_DIR = Path(os.getenv('FRANCHISE_INPUT_DATA_DIR', ROOT / 'data'))
INPUT_FILE = os.getenv('FRANCHISE_INPUT_FILE', '원천동.xlsx')


# Upstream notebook code cell 3 (zero-based)
conn = pymysql.connect(
    host=os.getenv('FRANCHISE_DB_HOST', '127.0.0.1'),
    port=int(os.getenv('FRANCHISE_DB_PORT', '3306')),
    user=os.getenv('FRANCHISE_DB_USER', 'franchise'),
    password=os.getenv('FRANCHISE_DB_PASSWORD', 'franchise'),
    db=os.getenv('FRANCHISE_DB_NAME', 'franchise_demo'),
    charset='utf8mb4',
)
cursor = conn.cursor()
cursor.execute('SELECT * FROM 상권정보')
rows = cursor.fetchall()
columns = [d[0] for d in cursor.description]
commercial_areas = pd.DataFrame(rows, columns=columns)

if DATA_MODE == 'demo':
    target = commercial_areas.loc[commercial_areas['상권_코드'] == 9000].copy()
    candidates = commercial_areas.loc[commercial_areas['상권_코드'] != 9000].copy()
    if target.empty:
        raise RuntimeError('Demo Target Area(상권_코드=9000)가 없습니다. docker compose down -v 후 다시 초기화하세요.')
else:
    target = pd.DataFrame(pd.read_excel(DATA_DIR / INPUT_FILE), columns=columns)
    candidates = commercial_areas.copy()

target[['상권_코드', '상권_코드_명']]
