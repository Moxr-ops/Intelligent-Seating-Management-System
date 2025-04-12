import { useState, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import FileUpload from './FileUpload';

const MAX_ROW_LENGTH = 10;
const MAX_COL_LENGTH = 10;

const SeatSelector = ({ onSelectChange }) => {
    const [selections, setSelections] = useState(new Set());
    const [startPos, setStartPos] = useState(null);

    const generateGrid = () => {
        return Array.from({ length: MAX_ROW_LENGTH }, (_, row) =>
            Array.from({ length: MAX_COL_LENGTH }, (_, col) => ({ row, col }))
        );
    };
    console.log("generateGrid over")
    const handleSelect = (start, end) => {
        const newSelections = new Set(selections);
        const minRow = Math.min(start.row, end.row);
        const maxRow = Math.max(start.row, end.row);
        const minCol = Math.min(start.col, end.col);
        const maxCol = Math.max(start.col, end.col);

        for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
                newSelections.add(`${r}-${c}`);
            }
        }
        setSelections(newSelections);
        onSelectChange([...newSelections]);
    };
    console.log("Handle over")

    return (
        <div className="seat-container">
            {generateGrid().map((row, i) => (
                <div key={i} className="seat-row">
                    {row.map(({ row, col }) => (
                        <div
                            key={`${row}-${col}`}
                            className={`seat-cell ${selections.has(`${row}-${col}`) ? 'selected' : ''}`}
                            onMouseDown={() => setStartPos({ row, col })}
                            onMouseEnter={() => {
                                if (startPos) handleSelect(startPos, { row, col })
                            }}
                            onMouseUp={() => setStartPos(null)}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
};

const DraggableStudent = ({ student, onSelect }) => {
    const [{ isDragging }, drag, preview] = useDrag(() => ({
        type: 'student',
        item: { student },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }), [student]);

    return (
        <div ref={preview} style={{ position: 'raletive' }}>
            <div
                ref={drag}
                className={`student ${isDragging ? 'dragging' : ''}`}
                onClick={() => onSelect(student)}
                style={{
                    opacity: isDragging ? 0.5 : 1,
                    transform: isDragging ? 'scale(0.9)' : 'none',
                    left: '1px',
                    top: '1px',
                    transition: 'all 0.2s ease',
                }}
            >
                {student.name}
            </div>
        </div>
    );
};

const StudentDropZone = ({ position, currentStudent, onDrop, onSelect }) => {
    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: 'student',
        drop: (item) => onDrop(item.student, position),
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
            canDrop: !!monitor.canDrop(),
        }),
    }));

    return (
        <div
            ref={drop}
            className={`drop-zone ${isOver ? 'hovered' : ''} ${canDrop ? 'can-drop' : ''}`}
            style={{
                position: 'absolute',
                left: `${position.col * 80}px`,
                top: `${position.row * 80}px`,
                width: '70px',
                height: '70px',
                transition: 'all 0.3s ease',
                transform: isOver ? 'scale(1.05)' : 'none',
            }}
            data-position={`${position.row}-${position.col}`}
        >
            {currentStudent && (
                <DraggableStudent
                    student={currentStudent}
                    onSelect={onSelect}
                />
            )}
        </div>
    );
};

const RelationLines = ({ relations, seatMap }) => {
    const getPosition = (studentId) => {
        for (const [pos, student] of seatMap.entries()) {
            if (student?.id === studentId) {
                return {
                    x: parseInt(pos.split('-')[1]) * 80 + 35,
                    y: parseInt(pos.split('-')[0]) * 80 + 35
                };
            }
        }
        return null;
    };

    return (
        <svg className="relation-lines" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
            {relations.map((relation, index) => {
                const pos1 = getPosition(relation.students[0]);
                const pos2 = getPosition(relation.students[1]);

                if (!pos1 || !pos2) return null;

                return (
                    <line
                        key={index}
                        className={`relation-line ${relation.type}-line`}
                        x1={pos1.x}
                        y1={pos1.y}
                        x2={pos2.x}
                        y2={pos2.y}
                    />
                );
            })}
        </svg>
    );
};

export default function SeatSystem() {
    const [students, setStudents] = useState([]);
    const [selectedSeats, setSelectedSeats] = useState([]);
    const [seatMap, setSeatMap] = useState(new Map());
    const [phase, setPhase] = useState(1);
    const [relations, setRelations] = useState([]);
    const [currentMode, setCurrentMode] = useState(null); 
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [generatedLayout, setGeneratedLayout] = useState(null);
    const [generationStatus, setGenerationStatus] = useState('');

    useEffect(() => {
        if (phase === 2 && students.length && selectedSeats.length) {
            const initialMap = new Map(
                selectedSeats.map((pos, idx) => [
                    pos,
                    students[idx] ? {
                        ...students[idx],
                        position: {
                            row: parseInt(pos.split('-')[0]),
                            col: parseInt(pos.split('-')[1])
                        }
                    } : null
                ])
            );
            setSeatMap(initialMap);
            console.log(Array.from(initialMap.entries())[1])
        }
    }, [phase, students, selectedSeats]);

    const handleDrop = (draggedStudent, targetPosition) => {
        setSeatMap(prev => {
            console.log("prev 0-0 Stu: ", prev.get("0-0"))
            const newMap = new Map(prev);
            const targetPosKey = `${targetPosition.row}-${targetPosition.col}`;

            let currentPosKey = null;

            for (const [pos, student] of newMap.entries()) {
                if (student && student.id === draggedStudent.id) {
                    currentPosKey = pos;
                    break;
                }
            }

            if (!currentPosKey) {
                console.error('Dragged student not found in seat map');
                return prev;
            }

            const targetStudent = newMap.get(targetPosKey);
            console.log("targetStu: ", targetStudent);

            if (targetStudent) {
                newMap.set(currentPosKey, {
                    ...targetStudent,
                    position: {
                        row: parseInt(currentPosKey.split('-')[0]),
                        col: parseInt(currentPosKey.split('-')[1])
                    }
                });
            } else {
                newMap.delete(currentPosKey);
            }
            console.log("currentPosStu: ", newMap.get(currentPosKey));

            newMap.set(targetPosKey, {
                ...draggedStudent,
                position: targetPosition
            });
            console.log("draggedStu: ", draggedStudent);
            console.log("targetPosStu: ", newMap.get(targetPosKey));
            console.log("check 0-0 Stu: ", newMap.get("0-0"));

            return newMap;
        });
    };

    const generateLayout = async () => {
        setGenerationStatus('生成中...');
        const requestData = {
            students: students.map(s => ({ id: s.id, name: s.name })),
            seats: selectedSeats,
            relations
        };

        try {
            const response = await fetch('http://localhost:5000/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });
            const layout = await response.json();
            setGeneratedLayout(layout);
            applyNewLayout(layout);
            setGenerationStatus('生成成功');
        } catch (error) {
            console.error('生成失败:', error);
        }
    };

    const applyNewLayout = (layout) => {
        const newMap = new Map();
        const assignedStudents = new Set();

        layout.forEach(({ student, position }) => {
            const key = `${position.row}-${position.col}`;

            // 验证有效性
            if (!selectedSeats.includes(key)) {
                console.warn(`无效座位分配：${key}`);
                return;
            }
            if (assignedStudents.has(student.id)) {
                console.warn(`重复分配学生：${student.name}`);
                return;
            }

            newMap.set(key, { ...student, position });
            assignedStudents.add(student.id);
        });

        students.forEach(s => {
            if (!assignedStudents.has(s.id)) {
                console.error(`学生未被分配：${s.name}`);
            }
        });

        setSeatMap(newMap);
    };

    const exportToPDF = async () => {
        try {
            const pdfData = {
                students: Array.from(seatMap.entries()).map(([pos, student]) => ({
                    ...student,
                    position: pos
                })),
                seats: selectedSeats
            };
    
            const response = await fetch('http://localhost:5000/export_pdf', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(pdfData)
            });
    
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'PDF generation failed');
            }
    
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = '座位表.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export error:', error);
            alert(`导出失败: ${error.message}`);
        }
    };

    const handleStudentSelect = (student) => {
        if (!currentMode) return;

        setSelectedStudents(prev => {
            const newSelection = [...prev, student.id];
            if (newSelection.length === 2) {
                setRelations(prevRelations => [
                    ...prevRelations,
                    {
                        students: newSelection,
                        type: currentMode
                    }
                ]);
                return [];
            }
            return newSelection;
        });
    };

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="system-container">
                <FileUpload onStudentsUpload={setStudents} />
                {students.length > 0 && (
                    <div className="student-count">
                        共找到学生: {students.length}人
                    </div>
                )}

                {phase === 1 ? (
                    <div className='placement-stage'>
                        <h3>第一步：选择座位位置（拖动框选）</h3>
                        <div className='selector-container'>
                            <SeatSelector onSelectChange={setSelectedSeats} />
                        </div>
                        {selectedSeats.length > 0 && (
                            <div className="seat-count">
                                已选择座位: {selectedSeats.length}个
                            </div>
                        )}
                        <button
                            onClick={() => setPhase(2)}
                            disabled={!selectedSeats.length || selectedSeats.length < students.length}
                        >
                            确认座位布局
                        </button>
                        {selectedSeats.length > 0 && selectedSeats.length < students.length && (
                            <div className="warning-message">
                                警告: 选择的座位数量({selectedSeats.length})少于学生人数({students.length})
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="placement-stage">
                        <h3>第二步：调整学生位置（拖动到目标位置）</h3>
                        <div className="controls">
                            <button onClick={() => setCurrentMode('avoid')}
                                className={currentMode === 'avoid' ? 'active' : ''}>
                                标记不宜同坐
                            </button>
                            <button onClick={() => setCurrentMode('prefer')}
                                className={currentMode === 'prefer' ? 'active' : ''}>
                                标记适宜同坐
                            </button>
                            <button onClick={generateLayout}>生成座次</button>
                            <div className="status-info">
                                {generationStatus}
                                {seatMap.size < students.length && (
                                    <span style={{ color: 'red' }}>
                                        （缺失{students.length - seatMap.size}人）
                                    </span>
                                )}
                            </div>
                            <button onClick={exportToPDF}>导出PDF</button>

                            {currentMode && (
                                <div className="mode-indicator">
                                    当前模式：{currentMode === 'avoid' ? '不宜同坐' : '适宜同坐'}
                                </div>
                            )}
                        </div>
                        <div className="student-container">
                            <RelationLines relations={relations} seatMap={seatMap} />
                            {Array.from(seatMap.entries()).map(([pos, student]) => {
                                const [row, col] = pos.split('-').map(Number);
                                return (
                                    <StudentDropZone
                                        key={pos}
                                        position={{ row, col }}
                                        currentStudent={student}
                                        onDrop={handleDrop}
                                        onSelect={handleStudentSelect}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </DndProvider>
    );
}