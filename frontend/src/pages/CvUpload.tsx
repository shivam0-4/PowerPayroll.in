import React, { useEffect, useRef, useState } from 'react';
import { FileText, Upload, UserRound } from 'lucide-react';
import { api } from '../api/client';
import { Employee, EmployeeDocument } from '../types';
import { useToast } from '../context/ToastContext';

const CV_ACCEPT =
  '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MAX_FILE_SIZE = 16 * 1024 * 1024;

export const CvUpload: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [uploadedDocument, setUploadedDocument] = useState<EmployeeDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const result = await api.getEmployees();
        setEmployees(result.employees);
      } catch (error: any) {
        showToast(error.message || 'Failed to load employees', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadEmployees();
  }, []);

  const selectedEmployee = employees.find(
    (employee) => employee.id === Number(selectedEmployeeId),
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setUploadedDocument(null);

    if (file && !/\.(pdf|doc|docx)$/i.test(file.name)) {
      showToast('CV must be a PDF, DOC, or DOCX file', 'error');
      event.target.value = '';
      setCvFile(null);
      return;
    }

    if (file && file.size > MAX_FILE_SIZE) {
      showToast('CV must be 16 MB or smaller', 'error');
      event.target.value = '';
      setCvFile(null);
      return;
    }

    setCvFile(file);
  };

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedEmployeeId || !cvFile) return;

    setIsUploading(true);
    try {
      const result = await api.uploadEmployeeCv(Number(selectedEmployeeId), cvFile);
      setUploadedDocument(result.document);
      setCvFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      showToast('CV uploaded successfully', 'success');
    } catch (error: any) {
      showToast(error.message || 'CV upload failed', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async () => {
    if (!uploadedDocument) return;
    try {
      await api.downloadEmployeeDocument(uploadedDocument.id, uploadedDocument.doc_name);
    } catch (error: any) {
      showToast(error.message || 'Failed to download CV', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Upload CV</h1>
        <p className="mt-1 text-sm text-slate-500">
          Select an employee and upload their CV or resume.
        </p>
      </div>

      <form onSubmit={handleUpload} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="space-y-5">
          <div>
            <label htmlFor="cv-employee" className="mb-1.5 block text-sm font-bold text-slate-800">
              Employee
            </label>
            <select
              id="cv-employee"
              value={selectedEmployeeId}
              onChange={(event) => {
                setSelectedEmployeeId(event.target.value);
                setUploadedDocument(null);
              }}
              disabled={isLoading || employees.length === 0}
              required
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-800 focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              <option value="">
                {isLoading ? 'Loading employees...' : 'Choose an employee'}
              </option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name} ({employee.emp_code})
                </option>
              ))}
            </select>
            {!isLoading && employees.length === 0 && (
              <p className="mt-2 text-sm text-amber-700">
                Add an employee in Employees Master before uploading a CV.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="cv-file" className="mb-1.5 block text-sm font-bold text-slate-800">
              CV / Resume file
            </label>
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 sm:p-5">
              <input
                ref={fileInputRef}
                id="cv-file"
                type="file"
                accept={CV_ACCEPT}
                onChange={handleFileChange}
                required={!uploadedDocument}
                className="block min-h-12 w-full text-sm text-slate-700 file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-white file:px-4 file:font-semibold file:text-brand-900"
              />
              <p className="mt-2 text-xs text-slate-500">
                PDF, DOC, or DOCX. Maximum file size: 16 MB.
              </p>
              {cvFile && (
                <p className="mt-3 flex items-start gap-2 break-all text-sm font-semibold text-brand-800">
                  <FileText className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  {cvFile.name}
                </p>
              )}
            </div>
          </div>

          {selectedEmployee && (
            <div className="flex items-center gap-3 rounded-xl bg-brand-50 p-3 text-sm text-brand-900">
              <UserRound className="h-5 w-5 flex-shrink-0" />
              <span>
                Uploading for <strong>{selectedEmployee.full_name}</strong> ({selectedEmployee.emp_code})
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || isUploading || !selectedEmployeeId || !cvFile}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-48"
          >
            <Upload className="h-4 w-4" />
            {isUploading ? 'Uploading...' : 'Upload CV'}
          </button>

          {uploadedDocument && (
            <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="break-all text-sm font-semibold text-emerald-800">
                CV uploaded: {uploadedDocument.doc_name}
              </p>
              <button
                type="button"
                onClick={handleDownload}
                className="min-h-11 rounded-lg border border-emerald-300 bg-white px-4 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
              >
                Test download
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
