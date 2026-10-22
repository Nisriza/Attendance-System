import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  ChevronRight,
  Loader2,
  CalendarCheck2,
  FileCheck2,
  UserPlus,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { User } from '../../types/index.ts';
import { StudentDetail } from './StudentDetail.tsx';

interface MyStudentsProps {
  onNavigateRegister?: () => void;
}

export const MyStudents: React.FC<MyStudentsProps> = ({ onNavigateRegister }) => {
  const [students, setStudents] = useState<Array<User & { attendanceCount: number; reportsCount: number }>>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const loadStudents = async () => {
    try {
      const data = await api.getApprovedStudents();
      setStudents(data);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  if (selectedStudentId) {
    return (
      <StudentDetail
        studentId={selectedStudentId}
        onBack={() => {
          setSelectedStudentId(null);
          loadStudents();
        }}
      />
    );
  }

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                Registered Student Directory
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Total registered students in system: <strong className="text-slate-800">{students.length}</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by full name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {onNavigateRegister && (
            <button
              onClick={onNavigateRegister}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" /> Register Student
            </button>
          )}
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-xs">Loading registered students...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="font-semibold text-slate-800 text-sm">No Students Found</h3>
            <p className="text-xs text-slate-400 mt-1">
              {search ? 'Try adjusting your search query.' : 'Registered students will appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 uppercase text-[11px] font-mono">
                  <th className="py-3 px-6 font-semibold">Student Fullname</th>
                  <th className="py-3 px-6 font-semibold text-center">Attendance Logs</th>
                  <th className="py-3 px-6 font-semibold text-center">Reports Submitted</th>
                  <th className="py-3 px-6 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedStudentId(s.id)}
                    className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs group-hover:bg-[#173B70] group-hover:text-white transition-colors">
                          {s.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="font-semibold text-slate-900 text-sm group-hover:text-blue-700 transition-colors">
                          {s.name}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center font-mono font-semibold text-slate-800">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px]">
                        <CalendarCheck2 className="w-3 h-3 text-blue-600" />
                        {s.attendanceCount}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center font-mono font-semibold text-slate-800">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px]">
                        <FileCheck2 className="w-3 h-3 text-purple-600" />
                        {s.reportsCount}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:text-blue-800">
                        View Dossier
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
