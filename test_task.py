from backend.app.celery_app import celery_app
from backend.app.tasks import solve_cramer
import time
from tqdm import tqdm

MAX_TIME = 5 * 60  

def read_from_txt(filename):
    with open(filename, "r") as f:
        lines = f.read().strip().splitlines()

    if '---' not in lines:
        raise ValueError("Файл має містити роздільник '---' між матрицею і вектором результатів")

    sep_index = lines.index('---')
    A_lines = lines[:sep_index]
    b_line = lines[sep_index+1:]

    A = [list(map(float, row.split())) for row in A_lines]
    if len(b_line) != 1:
        raise ValueError("Вектор результатів має бути в одному рядку")
    b = list(map(float, b_line[0].split()))

    n = len(A)
    if any(len(row) != n for row in A):
        raise ValueError("Матриця повинна бути квадратною")
    if len(b) != n:
        raise ValueError("Вектор результатів має бути тієї ж довжини, що й розмірність матриці")

    return n, A, b

def input_from_keyboard():
    n = int(input("Введіть розмірність квадратної матриці: "))
    print("Введіть матрицю построчно, елементи через пробіл:")
    A = []
    for i in range(n):
        row = list(map(float, input(f"Рядок {i+1}: ").split()))
        if len(row) != n:
            raise ValueError(f"Рядок {i+1} має містити {n} елементів")
        A.append(row)
    b = list(map(float, input("Введіть вектор результатів через пробіл: ").split()))
    if len(b) != n:
        raise ValueError("Вектор результатів має бути тієї ж довжини, що й розмірність матриці")
    return n, A, b

def main():
    choice = input("Читати з файлу чи з клавіатури? (f/k): ").strip().lower()
    n, A, b = (read_from_txt(input("Введіть шлях до txt файлу: ").strip()) if choice == 'f'
               else input_from_keyboard())

    print("Матриця A:")
    for row in A:
        print(row)
    print("Вектор b:", b)

    task = solve_cramer.apply_async(args=[A, b])
    print("Task ID:", task.id)

    start_time = time.time()
    last_progress = -1
    pbar = tqdm(total=100, ncols=100, bar_format='{l_bar}{bar}| {n_fmt}/{total_fmt}%')

    while not task.ready():
        elapsed = time.time() - start_time
        if elapsed > MAX_TIME:
            task.revoke(terminate=True)
            print("\nВиконання задачі перевищило 5 хвилин і було зупинене.")
            return

        info = task.info
        progress = int(info["progress"]) if info and isinstance(info, dict) and "progress" in info else 0

        if progress != last_progress:
            eta = (elapsed / progress * (100 - progress)) if progress > 0 else 0
            pbar.n = progress
            pbar.set_description(f"State: {task.state} | Elapsed: {elapsed:.1f}s | ETA: {eta:.1f}s")
            pbar.refresh()
            last_progress = progress

        time.sleep(0.2) 

    total_time = time.time() - start_time
    pbar.n = 100
    pbar.set_description(f"✅ Done in {total_time:.1f}s")
    pbar.refresh()
    pbar.close()

    try:
        result = task.get(timeout=1)
    except Exception as e:
        print("Помилка при отриманні результату:", e)
        return

    if "error" in result:
        print("Error:", result["error"])
    else:
        print("Result:", result["result"])

if __name__ == "__main__":
    main()
