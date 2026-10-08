export type Member = {
  id: string;
  name: string;
  level: string;
  goal: string;
};

export const mockMembers: Member[] = [
  {
    id: "1",
    name: "Sami",
    level: "Intermédiaire",
    goal: "Prendre de la force",
  },
  {
    id: "2",
    name: "Nora",
    level: "Débutante",
    goal: "Remise en forme",
  },
  {
    id: "3",
    name: "Amine",
    level: "Débutant",
    goal: "Cardio",
  },
];
