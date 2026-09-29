import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

class TermCard {
  constructor(term, fullDefinition, requiredKeywords) {
    this.term = term;
    this.fullDefinition = fullDefinition;
    this.requiredKeywords = requiredKeywords;
  }

  checkAnswer(userAnswer) {
    const lowerAnswer = userAnswer.toLowerCase();
    return this.requiredKeywords.filter((keyword) => !lowerAnswer.includes(keyword.toLowerCase()));
  }
}

const quizDeck = [
  new TermCard('Aspect', 'Color, orientation, or physical appearance of a signal.', ['color', 'orientation', 'physical appearance']),
  new TermCard('Indication', 'The information conveyed by the aspect of a signal.', ['information conveyed', 'aspect']),
  new TermCard(
    'Restricted Speed',
    'Operating speed, that will permit stopping within half the range of vision, short of another train, improperly aligned switch, track defect or obstruction, but never exceeding 15 mph.',
    ['operating speed', 'half the range of vision', 'short of', 'improperly aligned switch', 'track defect', 'obstruction', 'never exceeding 15 mph'],
  ),
  new TermCard(
    'Interlocking',
    'An arrangement of signals, switches, and control apparatus interconnected such that functions shall succeed each other in a predetermined sequence, which permits train movement over routes only when non-conflicting conditions exist.',
    ['arrangement of signals', 'switches', 'control apparatus', 'interconnected', 'shall succeed each other', 'predetermined sequence', 'non-conflicting conditions exist'],
  ),
];

async function runQuiz() {
  const rl = readline.createInterface({ input, output });

  console.log('\n==========================================');
  console.log('  LA METRO RAIL - TERMINOLOGY DRILL');
  console.log('==========================================\n');

  for (const [index, card] of quizDeck.entries()) {
    console.log(`[문제 ${index + 1}] "${card.term}"의 정의를 입력하세요:`);
    const answer = await rl.question('> ');

    const missingKeywords = card.checkAnswer(answer);

    if (missingKeywords.length === 0) {
      console.log('>> PASS (통과!)\n');
    } else {
      console.log('>> FAIL (누락된 필수 키워드):', missingKeywords.join(', '));
      console.log('>> [정답 원문]:', card.fullDefinition, '\n');
    }
  }

  console.log('수고하셨습니다! 4개 용어 테스트 완료.');
  rl.close();
}

runQuiz();