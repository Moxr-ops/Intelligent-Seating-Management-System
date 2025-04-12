// 拖拽项类型定义
export const ItemTypes = {
    STUDENT: 'student',      // 学生可拖拽类型
    SEAT: 'seat'             // 座位类型（如果需要拖拽座位）
  };
  
  // 默认座位布局配置
  export const DEFAULT_LAYOUT = {
    rows: 6,                 // 默认行数
    cols: 8,                 // 默认列数
    spacing: 10,             // 默认间距（像素）
    seatSize: 100            // 座位尺寸（像素）
  };
  
  // 颜色主题
  export const COLORS = {
    CONFLICT: '#ff1744',     // 冲突颜色
    OCCUPIED: '#e3f2fd',     // 已占位颜色
    EMPTY: '#ffffff',        // 空位颜色
    HOVER: '#f0f4c3'         // 悬停颜色
  };
  
  // 本地存储键名
  export const STORAGE_KEYS = {
    LAYOUT: 'classroom_layout',   // 座位布局存储键
    STUDENTS: 'students_data'     // 学生数据存储键
  };
  
  // 文件类型限制
  export const FILE_TYPES = {
    STUDENT_LIST: ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    GRADES: ['application/json']
  };
  
  // 冲突等级
  export const CONFLICT_LEVELS = {
    LOW: 1,
    MEDIUM: 3,
    HIGH: 5
  };