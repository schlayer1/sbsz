import { ExamDefinition, ExamScore, QuestionEvaluation } from '../types/exam';

export function calculateIhkScore(
  exam: ExamDefinition,
  answers: Record<number, number>,
  userDeselected: number[] = []
): ExamScore {
  const maxPoints = exam.requiredQuestions || 25;
  const nonDeselectableSet = new Set(exam.nonDeselectableQuestions || [6, 7, 8, 9, 12, 16, 20, 28]);

  // Gültige Abwahlen ermitteln (nicht-abwählbare Aufgaben dürfen niemals abgewählt werden)
  const validUserDeselected = userDeselected.filter(
    (qNum) => !nonDeselectableSet.has(qNum) && qNum >= 1 && qNum <= exam.totalQuestions
  );

  // IHK-Regel: Genau 3 Aufgaben abwählen.
  // "Sollten vom Prüfling keine Aufgaben abgewählt worden sein, sind die letzten 3 abwählbaren Aufgaben zu streichen."
  let finalDeselected = [...validUserDeselected];

  if (finalDeselected.length < exam.maxDeselections) {
    const missingCount = exam.maxDeselections - finalDeselected.length;
    // Von hinten nach vorne suchen nach abwählbaren Aufgaben, die noch nicht abgewählt wurden
    const autoDeselected: number[] = [];
    for (let q = exam.totalQuestions; q >= 1; q--) {
      if (!nonDeselectableSet.has(q) && !finalDeselected.includes(q)) {
        autoDeselected.push(q);
        if (autoDeselected.length === missingCount) break;
      }
    }
    finalDeselected = [...finalDeselected, ...autoDeselected];
  } else if (finalDeselected.length > exam.maxDeselections) {
    // Falls mehr als 3 gewählt wurden, auf max 3 begrenzen
    finalDeselected = finalDeselected.slice(0, exam.maxDeselections);
  }

  const deselectedSet = new Set(finalDeselected);
  const questionEvaluations: Record<number, QuestionEvaluation> = {};

  let totalPoints = 0;
  let correctCount = 0;
  let errorCount = 0;
  let answeredCount = 0;

  for (let q = 1; q <= exam.totalQuestions; q++) {
    const studentAns = answers[q] !== undefined ? answers[q] : null;
    const correctAns = exam.solutions[q] || 0;
    const isDeselected = deselectedSet.has(q);

    if (studentAns !== null && !isDeselected) {
      answeredCount++;
    }

    const isCorrect = !isDeselected && studentAns === correctAns;

    if (isCorrect) {
      totalPoints += 1;
      correctCount++;
    } else if (!isDeselected) {
      errorCount++;
    }

    questionEvaluations[q] = {
      studentAnswer: studentAns,
      correctAnswer: correctAns,
      isDeselected,
      isCorrect,
      points: isCorrect ? 1 : 0
    };
  }

  const percentage = Math.round((totalPoints / maxPoints) * 100);

  // Offizieller IHK-Notenschlüssel:
  // 100 - 92%: 1 (sehr gut)
  // 91 - 81%:  2 (gut)
  // 80 - 67%:  3 (befriedigend)
  // 66 - 50%:  4 (ausreichend)
  // 49 - 30%:  5 (mangelhaft)
  // < 30%:     6 (ungenügend)
  let grade = 6;
  let gradeText = "ungenügend";

  if (percentage >= 92) {
    grade = 1;
    gradeText = "sehr gut";
  } else if (percentage >= 81) {
    grade = 2;
    gradeText = "gut";
  } else if (percentage >= 67) {
    grade = 3;
    gradeText = "befriedigend";
  } else if (percentage >= 50) {
    grade = 4;
    gradeText = "ausreichend";
  } else if (percentage >= 30) {
    grade = 5;
    gradeText = "mangelhaft";
  }

  return {
    totalPoints,
    maxPoints,
    percentage,
    grade,
    gradeText,
    answeredCount,
    deselectedCount: finalDeselected.length,
    correctCount,
    errorCount,
    questionEvaluations
  };
}
