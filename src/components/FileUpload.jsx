import { useCallback, useState } from 'react';
import { parseCSV, parseExcel } from '../utils/fileParser';
import '../styles/FileUpload.css';

export default function FileUpload({ onStudentsUpload, onGradesUpload }) {
  const [file, setFile] = useState(null);

  const handleFile = useCallback(async (selectedFile, type) => {
    try {
      if (!selectedFile) return;
      
      setFile(selectedFile);
      const data = type === 'csv' 
        ? await parseCSV(selectedFile)
        : await parseExcel(selectedFile);
      
      type === 'students' 
        ? onStudentsUpload(data)
        : onGradesUpload(data);
      
      alert('文件上传成功');
      console.log(data);
    } catch (error) {
      setFile(null);
      alert(`上传失败: ${error.message}`);
    }
  }, [onStudentsUpload, onGradesUpload]);

  return (
    <div className="file-upload-section">
      <div className="upload-group">
        <label>上传学生名单</label>
        <label className="custom-file-input">
          选择文件
          <input 
            type="file" 
            accept=".csv,.xlsx"
            onChange={(e) => handleFile(e.target.files?.[0], 'students')}
            style={{ display: 'none' }}
          />
        </label>
        {file && (
          <div className="file-name">
            已选择: {file.name} ({Math.round(file.size / 1024)} KB)
          </div>
        )}
      </div>
    </div>
  );
}