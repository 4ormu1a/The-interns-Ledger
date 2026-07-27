import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, Field, Button } from "../../components/ui";
import { departmentApi } from "../../features/department/api";

export function DepartmentStudentsPage() {
  const { data: students, isLoading } = useQuery({
    queryKey: ["department", "students"],
    queryFn: departmentApi.students
  });

  const [search, setSearch] = useState("");
  const [progressFilter, setProgressFilter] = useState("all");

  const filteredStudents = useMemo(() => {
    if (!students) return [];
    return students.filter(s => {
      const matchSearch = !search || 
        s.full_name?.toLowerCase().includes(search.toLowerCase()) || 
        s.email?.toLowerCase().includes(search.toLowerCase()) || 
        s.company?.toLowerCase().includes(search.toLowerCase());
      
      const pct = s.required_hours ? Math.round((Number(s.completed_hours) / s.required_hours) * 100) : 0;
      let matchProgress = true;
      if (progressFilter === "completed") matchProgress = pct >= 100;
      if (progressFilter === "in-progress") matchProgress = pct < 100 && pct > 0;
      if (progressFilter === "not-started") matchProgress = pct === 0;

      return matchSearch && matchProgress;
    });
  }, [students, search, progressFilter]);

  if (isLoading) return null;
  
  const departmentName = students?.[0]?.department_name || "your department";

  const totalStudents = students?.length || 0;
  const activeStudents = students?.filter(s => {
    const pct = s.required_hours ? Math.round((Number(s.completed_hours) / s.required_hours) * 100) : 0;
    return pct > 0 && pct < 100;
  }).length || 0;
  const completedStudents = students?.filter(s => {
    const pct = s.required_hours ? Math.round((Number(s.completed_hours) / s.required_hours) * 100) : 0;
    return pct >= 100;
  }).length || 0;

  const handleExport = () => {
    if (!filteredStudents.length) return;
    const headers = ["Name,Email,Company,Completed Hours,Required Hours,Progress %"];
    const rows = filteredStudents.map(s => {
      const pct = s.required_hours ? Math.round((Number(s.completed_hours) / s.required_hours) * 100) : 0;
      return `"${s.full_name}","${s.email}","${s.company || 'N/A'}",${s.completed_hours || 0},${s.required_hours || 0},${pct}%`;
    });
    const csvContent = "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `students_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ marginBottom: 8 }}>My students</h1>
          <p style={{ color: "var(--muted)", margin: 0 }}>
            Reference list of all students in {departmentName} caseload.
          </p>
        </div>
        <Button variant={1} onClick={handleExport}>Export Data (CSV)</Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        <Card className="premium-card" style={{ padding: "16px 24px" }}>
          <div style={{ fontSize: "0.9rem", color: "var(--muted)", marginBottom: 4 }}>Total Students</div>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--green-900)" }}>{totalStudents}</div>
        </Card>
        <Card className="premium-card" style={{ padding: "16px 24px" }}>
          <div style={{ fontSize: "0.9rem", color: "var(--muted)", marginBottom: 4 }}>Active (Logging)</div>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--primary)" }}>{activeStudents}</div>
        </Card>
        <Card className="premium-card" style={{ padding: "16px 24px" }}>
          <div style={{ fontSize: "0.9rem", color: "var(--muted)", marginBottom: 4 }}>Completed (100%+)</div>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--success)" }}>{completedStudents}</div>
        </Card>
      </div>

      <Card className="premium-card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 300px" }}>
            <Field 
              label="Search" 
              name="search" 
              placeholder="Search by name, email, or company..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <div style={{ width: 200 }}>
            <label style={{ display: "block", marginBottom: 8, fontSize: "0.85rem", fontWeight: 600 }}>Progress</label>
            <select 
              className="field" 
              value={progressFilter} 
              onChange={e => setProgressFilter(e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="all">All students</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="not-started">Not Started</option>
            </select>
          </div>
        </div>
      </Card>

      {!filteredStudents?.length ? (
        <Card style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
          No students found matching your criteria.
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filteredStudents.map((student) => {
            const pct = student.required_hours ? Math.min(100, Math.round((Number(student.completed_hours) / student.required_hours) * 100)) : 0;
            let status = "Not Started";
            let statusColor = "var(--muted)";
            if (pct >= 100) { status = "Completed"; statusColor = "var(--success)"; }
            else if (pct > 0) { status = "In Progress"; statusColor = "var(--primary)"; }

            return (
              <Card key={student.id} className="premium-card" style={{ padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 250 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                      <h3 style={{ margin: 0 }}>{student.full_name}</h3>
                      <span style={{ fontSize: "0.75rem", fontWeight: 600, padding: "2px 8px", borderRadius: 12, border: `1px solid ${statusColor}`, color: statusColor }}>
                        {status}
                      </span>
                    </div>
                    <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>{student.email}</div>
                    {student.company && (
                      <div style={{ marginTop: 8, fontSize: "0.9rem" }}>
                        <span style={{ color: "var(--muted)" }}>Company:</span> <b>{student.company}</b>
                      </div>
                    )}
                  </div>
                  {student.required_hours && (
                    <div style={{ width: "100%", maxWidth: 300 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: "0.85rem" }}>
                        <span>Progress</span>
                        <span style={{ fontWeight: 600 }}>{Number(student.completed_hours).toFixed(1)} / {student.required_hours}h</span>
                      </div>
                      <div style={{ width: "100%", height: 8, background: "var(--line)", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ 
                          width: `${pct}%`, 
                          height: "100%", 
                          background: pct >= 100 ? "var(--success)" : "var(--primary)",
                          transition: "width 0.3s ease"
                        }} />
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
