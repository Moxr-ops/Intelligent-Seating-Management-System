import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// 配置参数
const MAX_HEADER_SEARCH_ROWS = 5; // 最大标题搜索行数
const NAME_KEYS = ['姓名', 'name', '学生姓名', 'student name'];

// 新版智能标题查找
const findHeaderRow = (rows) => {
  // 遍历前N行寻找包含姓名关键字的行
  for (let i = 0; i < Math.min(MAX_HEADER_SEARCH_ROWS, rows.length); i++) {
    const row = rows[i];
    const hasName = row.some(cell => 
      NAME_KEYS.some(key => 
        String(cell).toLowerCase().includes(key.toLowerCase())
      )
    );
    if (hasName) return i;
  }
  return -1;
};

// 通用姓名列匹配逻辑
const findNameColumn = (headerRow) => {
  return headerRow.find(cell =>
    NAME_KEYS.some(key =>
      String(cell).toLowerCase().includes(key.toLowerCase())
    )
  );
};

// CSV解析函数
export const parseCSV = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const rawResults = Papa.parse(e.target.result, {
          header: false,
          skipEmptyLines: true,
        });

        const headerRowIndex = findHeaderRow(rawResults.data);
        if (headerRowIndex === -1) {
          throw new Error('未找到包含姓名列的表头');
        }

        const parsed = Papa.parse(e.target.result, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (_, index) => 
            rawResults.data[headerRowIndex][index] || `column_${index}`
        });

        const nameColumn = findNameColumn(rawResults.data[headerRowIndex]);
        const dataStartRow = headerRowIndex + 1;
        
        const students = parsed.data
          .slice(dataStartRow)
          .map((row, index) => ({
            id: index + 1,
            name: row[nameColumn]?.trim() || `学生 ${index + 1}`
          }))
          .filter(s => s.name);

        resolve(students);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
};

// 修改后的Excel解析函数
export const parseExcel = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
          header: 1,
          defval: ""
        });

        const headerRowIndex = findHeaderRow(jsonData);
        if (headerRowIndex === -1) {
          throw new Error('未找到包含姓名列的表头');
        }

        const headerRow = jsonData[headerRowIndex];
        const nameColumn = findNameColumn(headerRow);
        const nameIndex = headerRow.indexOf(nameColumn);

        const students = jsonData
          .slice(headerRowIndex + 1)
          .map((row, index) => ({
            id: index + 1,
            name: (row[nameIndex]?.toString().trim() || `学生 ${index + 1}`)
          }))
          .filter(s => s.name);

        resolve(students);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
};