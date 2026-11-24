import pandas as pd
import numpy as np

# Генерируем 2000 задач
n = 2000
np.random.seed(42)

data = {
    'days_to_deadline': np.random.randint(1, 30, n),
    'work': np.random.randint(1, 10, n),
    'complexity': np.random.randint(1, 5, n),
    'assignee_load': np.random.randint(0, 20, n),
    'n_dependents': np.random.randint(0, 5, n),
}

# Имитация "экспертной" оценки (чем ближе дедлайн и больше зависимых задач, тем выше балл)
# Добавляем немного шума, чтобы модель реально училась
expert_score = (
    (30 - data['days_to_deadline']) * 0.05 + 
    (10 - data['work']) * 0.02 + 
    data['n_dependents'] * 0.1 + 
    np.random.normal(0, 0.1, n)
)

# Нормализуем от 0 до 1
expert_score = (expert_score - expert_score.min()) / (expert_score.max() - expert_score.min())
data['expert_score'] = expert_score

df = pd.DataFrame(data)
df.to_csv("tasks_history.csv", index=False)
print("Данные сгенерированы и сохранены в tasks_history.csv")