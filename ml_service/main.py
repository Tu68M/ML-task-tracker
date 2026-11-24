from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import heapq
from typing import List, Dict

app = FastAPI()
model = joblib.load("model.joblib")

# Модели данных для валидации
class Task(BaseModel):
    id: str
    days_to_deadline: float
    work: float
    complexity: float
    assignee_load: float
    n_dependents: float
    deadline: str # дата в формате YYYY-MM-DD

class PrioritizeRequest(BaseModel):
    tasks: List[Task]
    deps: List[tuple[str, str]] # [(i, j)] где i должна быть выполнена до j

# Алгоритм топологической сортировки с приоритетом (из совета)
def prioritize(task_ids, deps, scores):
    indeg = {t: 0 for t in task_ids}
    nxt = {t: [] for t in task_ids}
    for i, j in deps:
        nxt[i].append(j)
        indeg[j] += 1

    heap = [(-scores[t], t) for t in task_ids if indeg[t] == 0]
    heapq.heapify(heap)
    order = []
    while heap:
        _, t = heapq.heappop(heap)
        order.append(t)
        for j in nxt[t]:
            indeg[j] -= 1
            if indeg[j] == 0:
                heapq.heappush(heap, (-scores[j], j))

    if len(order) != len(task_ids):
        raise ValueError("В зависимостях есть цикл")
    return {t: k + 1 for k, t in enumerate(order)}

@app.post("/api/prioritize")
def api_prioritize(payload: PrioritizeRequest):
    if not payload.tasks:
        return {"priorities": {}}

    # 1. Достаем признаки для ML
    features = []
    task_ids = []
    for t in payload.tasks:
        task_ids.append(t.id)
        features.append([
            t.days_to_deadline, t.work, t.complexity, 
            t.assignee_load, t.n_dependents
        ])

    # 2. Предсказываем важность
    scores_list = model.predict(features)
    scores = dict(zip(task_ids, scores_list))

    # 3. Строим порядок с учетом зависимостей
    try:
        priorities = prioritize(task_ids, payload.deps, scores)
    except ValueError as e:
        return {"error": str(e)}

    return {"priorities": priorities}