// app.mjs
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { termsData } from './data/terms.mjs';
import { signalsData } from './data/signals.mjs';

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

// 용어 데이터와 신호 데이터를 하나로 병합
const combinedData = [...termsData, ...signalsData];

const quizDeck = combinedData.map((item) => new TermCard(item.term, item.fullDefinition, item.requiredKeywords));

async function runQuiz() {
  const rl = readline.createInterface({ input, output });

  console.log('\n==========================================');
  console.log('   LA METRO RAIL - DRILL (용어 + 신호 룰)');
  console.log('==========================================\n');

  for (const [index, card] of quizDeck.entries()) {
    // 신호(Rule)인지 일반 용어인지에 따라 질문 분기
    if (card.term.startsWith('Rule')) {
      console.log(`[문제 ${index + 1}] Signal "${card.term}"의 Indication(지시 내용)을 입력하세요:`);
    } else {
      console.log(`[문제 ${index + 1}] 용어 "${card.term}"의 정의(Definition)를 입력하세요:`);
    }

    const answer = await rl.question('> ');

    const missingKeywords = card.checkAnswer(answer);

    if (missingKeywords.length === 0) {
      console.log('>> PASS (통과!)\n');
    } else {
      console.log('>> FAIL (누락된 필수 키워드):', missingKeywords.join(', '));
      console.log('>> [정답 원문]:', card.fullDefinition, '\n');
    }
  }

  console.log(`수고하셨습니다! 총 ${quizDeck.length}개 문제 완료.`);
  rl.close();
}

runQuiz();
