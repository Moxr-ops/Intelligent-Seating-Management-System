from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import random
import logging
import math
from itertools import combinations
from fpdf import FPDF
from flask import Flask, request, jsonify, send_file
import io
import logging

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Student:
    """学生实体类"""
    def __init__(self, id, name):
        self.id = id
        self.name = name

class SeatAssignment:
    def __init__(self, students, seats, relations):
        self.students = students
        self.seat_pool = [tuple(map(int, s.split('-'))) for s in seats]
        self.valid_seats = set(self.seat_pool)
        self.student_ids = [s.id for s in students]

        self.avoid_pairs = set()
        self.prefer_pairs = set()
        
        for rel in relations:
            sorted_ids = tuple(sorted(rel["students"]))
            if rel["type"] == "avoid":
                self.avoid_pairs.add(sorted_ids)
            elif rel["type"] == "prefer":
                self.prefer_pairs.add(sorted_ids)

        if len(self.seat_pool) < len(students):
            raise ValueError(f"座位不足（需要 {len(students)} 个，现有 {len(self.seat_pool)} 个）")
        if any(not isinstance(s, tuple) for s in self.seat_pool):
            raise ValueError("座位格式必须为 (row, col) 元组")

    def calculate_distance(self, seat1, seat2):
        """计算两个座位之间的曼哈顿距离"""
        return abs(seat1[0]-seat2[0]) + abs(seat1[1]-seat2[1])

    def create_individual(self):
        """创建合法个体（保证每个学生都有唯一座位）"""
        return random.sample(self.seat_pool, len(self.students))

    def crossover(self, parent1, parent2):
        """有序交叉（OX）保持座位唯一性"""
        size = len(parent1)
        a, b = sorted(random.sample(range(size), 2))
        
        child = [None] * size
        child[a:b] = parent1[a:b]
        
        remaining = [s for s in parent2 if s not in child]
        ptr = 0
        for i in list(range(a)) + list(range(b, size)):
            if child[i] is None:
                child[i] = remaining[ptr]
                ptr += 1
        return child

    def mutate(self, chromo):
        """交换变异保持座位唯一性"""
        new_chromo = chromo.copy()
        i, j = random.sample(range(len(new_chromo)), 2)
        new_chromo[i], new_chromo[j] = new_chromo[j], new_chromo[i]
        return new_chromo

    def genetic_algorithm(self):
        POP_SIZE = 50
        GENERATIONS = 100
        
        population = [self.create_individual() for _ in range(POP_SIZE)]
        
        for _ in range(GENERATIONS):
            graded = []
            for chromo in population:
                assignment = dict(zip(self.student_ids, chromo))
                graded.append((self.fitness(assignment), chromo))
            
            total = sum(g[0] for g in graded)
            selected = []
            for _ in range(POP_SIZE):
                pick = random.uniform(0, total)
                current = 0
                for score, chromo in graded:
                    current += score
                    if current > pick:
                        selected.append(chromo)
                        break
            
            children = []
            while len(children) < POP_SIZE//2:
                parent1, parent2 = random.sample(selected, 2)
                child = self.crossover(parent1, parent2)
                children.append(child)
            
            children = [self.mutate(c) for c in children]
            population = selected[:POP_SIZE//2] + children
        
        best = max(population, key=lambda c: self.fitness(dict(zip(self.student_ids, c))))
        return dict(zip(self.student_ids, best))

    def fitness(self, assignment):
        """强化有效性验证"""
        if len(assignment) != len(self.students):
            return -float('inf')
            
        if len(set(assignment.values())) != len(self.students):
            return -float('inf')
        score = 0
        
        for (id1, id2) in self.avoid_pairs:
            if id1 in assignment and id2 in assignment:
                dist = self.calculate_distance(assignment[id1], assignment[id2])
                penalty = max(3 - dist, 0) * 10
                score -= penalty

        for (id1, id2) in self.prefer_pairs:
            if id1 in assignment and id2 in assignment:
                dist = self.calculate_distance(assignment[id1], assignment[id2])
                reward = max(2 - dist, 0) * 5
                score += reward

        for seat in assignment.values():
            if seat not in self.valid_seats:
                score -= 1000

        return score

    def genetic_algorithm(self):
        """遗传算法实现"""
        POP_SIZE = 50
        GENERATIONS = 100
        MUTATION_RATE = 0.1

        def create_individual():
            return random.sample(self.seat_pool, len(self.students))
        
        population = [create_individual() for _ in range(POP_SIZE)]

        for _ in range(GENERATIONS):
            graded = []
            for chromo in population:
                assignment = {s.id: seat for s, seat in zip(self.students, chromo)}
                graded.append((self.fitness(assignment), chromo))
            
            graded.sort(reverse=True, key=lambda x: x[0])
            selected = [x[1] for x in graded[:POP_SIZE//2]]

            children = []
            while len(children) < POP_SIZE//2:
                parent1, parent2 = random.sample(selected, 2)
                pivot = random.randint(1, len(self.students)-1)
                child = parent1[:pivot] + parent2[pivot:]
                children.append(child)

            def mutate(chromo):
                new_chromo = chromo.copy()
                for i in range(len(new_chromo)):
                    if random.random() < MUTATION_RATE:
                        new_chromo[i] = random.choice(self.seat_pool)
                return new_chromo
            
            children = [mutate(c) for c in children]
            population = selected + children

        best = max(population, key=lambda c: self.fitness(
            {s.id: seat for s, seat in zip(self.students, c)}))
        return {s.id: seat for s, seat in zip(self.students, best)}

    def generate(self):
        """
        生成最终座位分配方案
        返回: {学生ID: (row, col)}
        """
        if len(self.seat_pool) < len(self.students):
            raise ValueError("座位数量不足")

        self.assignment = self.genetic_algorithm()
        
        for seat in self.assignment.values():
            if seat not in self.valid_seats:
                raise RuntimeError("算法错误：生成了无效座位分配")
        
        return self.assignment

@app.route('/generate', methods=['POST'])
def handle_generate():
    """处理生成请求的主端点"""
    try:
        data = request.get_json()
        logger.info(f"收到生成请求: {data}")
        
        if not all(key in data for key in ['students', 'seats', 'relations']):
            return jsonify({"error": "Invalid request format"}), 400

        students = [Student(s['id'], s['name']) for s in data['students']]
        
        assigner = SeatAssignment(
            students=students,
            seats=data['seats'],
            relations=data['relations']
        )
        
        assignment = assigner.generate()
        
        result = []
        for student in students:
            if student.id in assignment:
                row, col = assignment[student.id]
                result.append({
                    "student": {
                        "id": student.id,
                        "name": student.name
                    },
                    "position": {
                        "row": row,
                        "col": col
                    }
                })
        
        logger.info(f"生成成功，分配{len(result)}个座位")
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"处理请求时发生错误: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/export_pdf', methods=['POST'])
def export_pdf():
    """Generate PDF seat chart with robust request handling"""
    try:
        if not request.is_json:
            return jsonify({"error": "Request must be JSON"}), 400

        try:
            data = request.get_json(force=True, silent=False)
        except Exception as e:
            logger.error(f"JSON decode error: {str(e)}")
            return jsonify({"error": "Invalid JSON data"}), 400

        if not data or 'seats' not in data or 'students' not in data:
            return jsonify({"error": "Missing required fields"}), 400

        pdf = FPDF()
        pdf.add_page()
        pdf.set_auto_page_break(False)
        
        font_path = 'fonts/'
        try:
            pdf.add_font('NotoSansCJK', '',  font_path + 'NotoSansCJKsc-Regular.otf')
            pdf.add_font('NotoSansCJK', 'B', font_path + 'NotoSansCJKsc-Bold.otf')
            pdf.set_font('NotoSansCJK', size=19)
        except FileNotFoundError as e:
            logger.error(f"缺失字体文件: {str(e)}")
            return jsonify({"error": "系统缺少必要的中文字体"}), 500

        seat_coords = [tuple(map(int, s.split('-'))) for s in data['seats']]
        max_row = max(row for row, col in seat_coords) + 1 if seat_coords else 0
        max_col = max(col for row, col in seat_coords) + 1 if seat_coords else 0

        cell_size = 20
        margin = 15
        grid_width = max_col * cell_size
        start_x = (210 - grid_width) / 2

        pdf.set_font('NotoSansCJK', style='B', size=16)
        pdf.cell(0, 15, txt="教室座位表", ln=1, align='C')

        position_map = {s['position']: s for s in data['students']}
        for row in range(max_row):
            for col in range(max_col):
                x = start_x + col * cell_size
                y = margin + 25 + row * cell_size
                _draw_seat(pdf, position_map, f"{row}-{col}", x, y, cell_size)

        try:
            pdf_bytes = pdf.output(dest='S')
            
            pdf_buffer = io.BytesIO(pdf_bytes)
            
            return send_file(
                pdf_buffer,
                mimetype='application/pdf',
                as_attachment=True,
                download_name='座位表.pdf'
            )
        except Exception as e:
            logger.error(f"PDF输出失败: {str(e)}")
            return jsonify({"error": "PDF生成失败"}), 500

    except Exception as e:
        logger.error(f"请求处理异常: {str(e)}")
        return jsonify({"error": "服务器错误"}), 500

def _draw_seat(pdf, position_map, seat_key, x, y, size):
    """绘制单个座位单元"""
    if (int(seat_key.split('-')[1]) + 1) % 3 == 0:
        pdf.set_fill_color(225, 225, 225)
        pdf.rect(x, y, size, size, 'F')
    
    pdf.rect(x, y, size, size)
    
    if seat_key in position_map:
        _draw_student_name(
            pdf,
            position_map[seat_key]['name'],
            x + 2,
            y + 2,
            size - 4
        )

def _draw_student_name(pdf, name, x, y, max_width):
    """智能文本绘制"""
    original_size = 13
    pdf.set_font('NotoSansCJK', size=original_size)
    
    while pdf.get_string_width(name) > max_width and original_size > 6:
        original_size -= 0.5
        pdf.set_font_size(original_size)
    
    if pdf.get_string_width(name) > max_width:
        lines = []
        current_line = []
        for char in name:
            current_line.append(char)
            if pdf.get_string_width(''.join(current_line)) > max_width:
                lines.append(''.join(current_line[:-1]))
                current_line = [char]
        if current_line:
            lines.append(''.join(current_line))
    else:
        lines = [name]
    
    line_height = 5
    total_height = len(lines) * line_height
    start_y = y + (max_width + 4 - total_height) / 2
    
    for idx, line in enumerate(lines):
        pdf.text(
            x + (max_width - pdf.get_string_width(line)) / 2,
            start_y + idx * line_height,
            line
        )

# app.run(host='0.0.0.0', port=5000, debug=True)