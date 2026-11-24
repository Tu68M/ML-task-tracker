import pandas as pd
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error

FEATURES = ["days_to_deadline", "work", "complexity", "assignee_load", "n_dependents"]

df = pd.read_csv("tasks_history.csv")
X, y = df[FEATURES], df["expert_score"]
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)

model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_tr, y_tr)

print(f"MAE (ошибка): {mean_absolute_error(y_te, model.predict(X_te)):.4f}")
joblib.dump(model, "model.joblib")
print("Модель обучена и сохранена в model.joblib")