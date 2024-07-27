import { Teacher } from "../interfaces/teacher";

export const teachersList: Teacher[] = [
  {
    id: "1",
    name: "John",
    lastName: "Doe",
    ci: "12345678",
    type: { value: "full-time", label: "Full-time" },
    photo: "https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg",
    title: "Professor",
    partTime: 16,
    load: [
      { id: "5", subject: "Math", hours: 5 },
      { id: "6", subject: "Physics", hours: 8 },
    ],
    perfil: ["5", "6", "7"],
    gender: "m",
  },
  {
    id: "2",
    name: "Jane",
    lastName: "Smith",
    ci: "87654321",
    type: { value: "part-time", label: "Part-time" },
    photo: null,
    title: "Lecturer",
    partTime: 10,
    load: [
      { id: "1", subject: "English", hours: 4 },
      { id: "2", subject: "Literature", hours: 6 },
    ],
    perfil: ["1", "2", "3"],
    gender: "f",
  },
  {
    id: "3",
    name: "Michael",
    lastName: "Johnson",
    ci: "24681012",
    type: { value: "full-time", label: "Full-time" },
    photo: null,
    title: "Associate Professor",
    partTime: 18,
    load: [
      { id: "3", subject: "Computer Science", hours: 6 },
      { id: "4", subject: "Data Structures", hours: 6 },
    ],
    perfil: ["3", "4"],
    gender: "m",
  },
  {
    id: "4",
    name: "Emily",
    lastName: "Davis",
    ci: "13579246",
    type: { value: "part-time", label: "Part-time" },
    photo: null,
    title: "Adjunct Professor",
    partTime: 6,
    load: [
      { id: "7", subject: "Biology", hours: 3 },
      { id: "8", subject: "Ecology", hours: 3 },
    ],
    perfil: ["5", "6", "7", "8"],
    gender: "f",
  },
  {
    id: "5",
    name: "David",
    lastName: "Lee",
    ci: "24681357",
    type: { value: "full-time", label: "Full-time" },
    photo: null,
    title: "Professor",
    partTime: 20,
    load: [
      { id: "9", subject: "Business Management", hours: 8 },
      { id: "10", subject: "Entrepreneurship", hours: 8 },
    ],
    perfil: ["9", "10"],
    gender: "m",
  },
  {
    id: "6",
    name: "Sophia",
    lastName: "Gonzalez",
    ci: "97531486",
    type: { value: "part-time", label: "Part-time" },
    photo: null,
    title: "Lecturer",
    partTime: 8,
    load: [
      { id: "11", subject: "Spanish", hours: 4 },
      { id: "12", subject: "Latin American Literature", hours: 4 },
    ],
    perfil: ["9", "10", "11", "12"],
    gender: "f",
  },
  {
    id: "7",
    name: "Alexander",
    lastName: "Müller",
    ci: "86420159",
    type: { value: "full-time", label: "Full-time" },
    photo: null,
    title: "Associate Professor",
    partTime: 22,
    load: [
      { id: "13", subject: "German", hours: 6 },
      { id: "14", subject: "European History", hours: 6 },
    ],
    perfil: ["13", "14"],
    gender: "m",
  },
  {
    id: "8",
    name: "Olivia",
    lastName: "Fernandez",
    ci: "47853912",
    type: { value: "part-time", label: "Part-time" },
    photo: null,
    title: "Lecturer",
    partTime: 12,
    load: [
      { id: "15", subject: "Art History", hours: 6 },
      { id: "16", subject: "Painting", hours: 6 },
    ],
    perfil: ["15", "16", "18"],
    gender: "f",
  },
  {
    id: "9",
    name: "William",
    lastName: "Rodriguez",
    ci: "31975842",
    type: { value: "full-time", label: "Full-time" },
    photo: null,
    title: "Professor",
    partTime: 24,
    load: [
      { id: "17", subject: "Philosophy", hours: 8 },
      { id: "18", subject: "Ethics", hours: 8 },
    ],
    perfil: ["Experienced", "Research-oriented"],
    gender: "m",
  },
  {
    id: "10",
    name: "Isabella",
    lastName: "Nguyen",
    ci: "64782910",
    type: { value: "part-time", label: "Part-time" },
    photo: null,
    title: "Lecturer",
    partTime: 10,
    load: [
      { id: "19", subject: "Psychology", hours: 5 },
      { id: "20", subject: "Sociology", hours: 5 },
    ],
    perfil: ["Passionate", "Innovative"],
    gender: "f",
  },
  {
    id: "11",
    name: "Daniel",
    lastName: "Patel",
    ci: "85231746",
    type: { value: "full-time", label: "Full-time" },
    photo: null,
    title: "Associate Professor",
    partTime: 20,
    load: [
      { id: "21", subject: "Computer Engineering", hours: 8 },
      { id: "22", subject: "Robotics", hours: 8 },
    ],
    perfil: ["Experienced", "Researcher"],
    gender: "m",
  },
  {
    id: "12",
    name: "Ava",
    lastName: "Hernandez",
    ci: "73495128",
    type: { value: "part-time", label: "Part-time" },
    photo: null,
    title: "Lecturer",
    partTime: 8,
    load: [
      { id: "23", subject: "Music Theory", hours: 4 },
      { id: "24", subject: "Composition", hours: 4 },
    ],
    perfil: ["1", "22", "23", "24"],
    gender: "f",
  },
  {
    id: "13",
    name: "Jacob",
    lastName: "Saito",
    ci: "92617534",
    type: { value: "full-time", label: "Full-time" },
    photo: null,
    title: "Professor",
    partTime: 22,
    load: [
      { id: "25", subject: "Japanese", hours: 8 },
      { id: "26", subject: "Asian Studies", hours: 8 },
    ],
    perfil: ["23", "24", "25", "26"],
    gender: "m",
  },
  {
    id: "14",
    name: "Emma",
    lastName: "Tanaka",
    ci: "48375612",
    type: { value: "part-time", label: "Part-time" },
    photo: null,
    title: "Lecturer",
    partTime: 6,
    load: [
      { id: "27", subject: "Fashion Design", hours: 3 },
      { id: "28", subject: "Textile Arts", hours: 3 },
    ],
    perfil: ["27", "28"],
    gender: "f",
  },
  {
    id: "15",
    name: "Ethan",
    lastName: "Morales",
    ci: "71928354",
    type: { value: "full-time", label: "Full-time" },
    photo: null,
    title: "Associate Professor",
    partTime: 24,
    load: [
      { id: "29", subject: "Marketing", hours: 8 },
      { id: "30", subject: "Advertising", hours: 8 },
    ],
    perfil: ["22", "29", "30"],
    gender: "m",
  },
];