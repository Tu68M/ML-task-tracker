# ml_service/simulation.py
import heapq
import random
import statistics
import joblib
import numpy as np

# Загружаем нашу обученную ML-модель
try:
    model = joblib.load("model.joblib")
except Exception as e:
    print("Ошибка загрузки модели. Убедитесь, что model.joblib существует.")
    model = None

def simulate(policy_name, lam, k=3, mean_w=3.0, n=1000, seed=42):
    """
    Симуляция СМО.
    policy_name: 'FIFO', 'EDF' или 'ML'
    lam: интенсивность потока (среднее число задач в час)
    k: количество исполнителей
    mean_w: средняя трудоемкость задачи
    n: количество задач для симуляции
    """
    rng = random.Random(seed)
    
    # 1. Генерируем поток задач
    tasks = []
    current_time = 0.0
    for i in range(n):
        # Время поступления (экспоненциальное распределение)
        current_time += rng.expovariate(lam)
        
        # Трудоемкость (экспоненциальное распределение)
        w = rng.expovariate(1 / mean_w)
        
        # Дедлайн: случайное время от 5 до 30 часов от момента поступления
        deadline = current_time + rng.uniform(5, 30)
        
        # Зависимости: для простоты пока без них (или можно добавить случайные)
        deps = []
        if i > 0 and rng.random() < 0.3: # 30% задач имеют зависимость от предыдущей
            deps.append(rng.randint(max(0, i-5), i-1))
            
        # Признаки для ML-модели
        days_to_deadline = (deadline - current_time) / 24.0
        complexity = rng.randint(1, 5)
        n_dependents = sum(1 for t in tasks if i in t['deps']) # Считаем, сколько задач зависят от этой
        
        tasks.append({
            'id': i,
            'a': current_time,       # arrival time (время поступления)
            'w': w,                  # work (трудоемкость)
            'd': deadline,           # deadline
            'deps': deps,
            'ml_score': 0,           # Сюда запишем оценку от ML
            # Признаки для ML
            'features': [days_to_deadline, w, complexity, 0, n_dependents]
        })

    # 2. Считаем ML-оценки для всех задач (если выбран алгоритм ML)
    if policy_name == 'ML' and model is not None:
        features_array = [t['features'] for t in tasks]
        scores = model.predict(features_array)
        for i, t in enumerate(tasks):
            # Инвертируем оценку, так как heapq берет минимальное значение (а нам нужен максимальный приоритет)
            t['ml_score'] = -scores[i] 

    # 3. Инициализация событий и очередей
    events = [] # (время, тип_события, id_задачи). тип_события: 0 - приход, 1 - завершение
    for t in tasks:
        heapq.heappush(events, (t['a'], 0, t['id']))

    done = set()
    pending = {} # Сколько зависимостей осталось
    children = {} # Кто зависит от задачи
    ready = [] # Задачи, готовые к выполнению (зависимости выполнены)
    free_workers = k
    finish_times = {}
    wait_times = []

    # 4. Основной цикл симуляции
    while events:
        now, kind, task_id = heapq.heappop(events)

        if kind == 0: # Задача пришла
            task = tasks[task_id]
            # Проверяем зависимости
            left = [d for d in task['deps'] if d not in done]
            pending[task_id] = len(left)
            for d in left:
                children.setdefault(d, []).append(task_id)
            
            if not left:
                ready.append(task_id)
        else: # Задача завершена
            free_workers += 1
            done.add(task_id)
            finish_times[task_id] = now
            
            # Освобождаем зависимые задачи
            for child in children.get(task_id, []):
                pending[child] -= 1
                if pending[child] == 0:
                    ready.append(child)

        # 5. Раздача задач исполнителям
        while free_workers > 0 and ready:
            # Выбираем задачу в зависимости от политики
            if policy_name == 'FIFO':
                # Первая пришедшая — первая уходит
                ready.sort(key=lambda x: tasks[x]['a'])
                next_task = ready.pop(0)
            elif policy_name == 'EDF':
                # Earliest Deadline First (ближайший дедлайн)
                ready.sort(key=lambda x: tasks[x]['d'])
                next_task = ready.pop(0)
            elif policy_name == 'ML':
                # По оценке ML (наивысший приоритет)
                ready.sort(key=lambda x: tasks[x]['ml_score'])
                next_task = ready.pop(0)
            else:
                next_task = ready.pop(0)

            task = tasks[next_task]
            free_workers -= 1
            
            # Считаем время ожидания (от прихода до начала выполнения)
            wait_time = now - task['a']
            wait_times.append(wait_time)
            
            # Планируем завершение
            heapq.heappush(events, (now + task['w'], 1, next_task))

    # 6. Считаем итоговые метрики
    avg_wait = statistics.mean(wait_times)
    overdue_count = sum(1 for t in tasks if finish_times[t['id']] > t['d'])
    
    return avg_wait, overdue_count

# --- Запуск тестов ---
if __name__ == "__main__":
    # Нагрузка (ρ = λ / (k * μ)). 
    # Если μ = 1/mean_w = 1/3, k = 3, то при λ = 0.5 нагрузка = 0.5 / (3 * 0.33) = 0.5
    # При λ = 0.9 нагрузка = 0.9 (близко к пределу)
    load_levels = [0.3, 0.5, 0.7, 0.9] 
    
    print(f"{'Нагрузка':<10} | {'Алгоритм':<10} | {'Ср. ожидание (ч)':<20} | {'Просрочено':<12}")
    print("-" * 60)

    for lam in [0.5, 0.7, 0.9]: # Разные интенсивности потока
        for policy in ['FIFO', 'EDF', 'ML']:
            avg_wait, overdue = simulate(policy, lam, n=1000)
            print(f"{lam:<10} | {policy:<10} | {avg_wait:<20.2f} | {overdue:<12}")
        print("-" * 60)