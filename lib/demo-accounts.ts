/** Demo credentials shared by the login screen (client-safe copy). */
export const DEMO_CREDENTIALS = [
  { email: "student@almohandes.edu", password: "Student@123", role: "STUDENT", nameAr: "محمود عبد الرحمن", nameEn: "Student" },
  { email: "teacher@almohandes.edu", password: "Teacher@123", role: "TEACHER", nameAr: "د. أحمد الشاذلي", nameEn: "Teacher" },
  { email: "admin@almohandes.edu", password: "Admin@123", role: "INSTITUTION_ADMIN", nameAr: "سارة منصور", nameEn: "Institution Admin" },
  { email: "supervisor@almohandes.edu", password: "Super@123", role: "EXAM_SUPERVISOR", nameAr: "عمر الجندي", nameEn: "Exam Supervisor" },
  { email: "root@almohandes.edu", password: "Root@123", role: "SUPER_ADMIN", nameAr: "د. هاني عبد العال", nameEn: "Super Admin" },
] as const;
