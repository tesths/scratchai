import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCurrentTargetScriptXmlList,
  buildRecommendedBlockXml
} from "../dist/scratch-block-xml.js";

test("buildCurrentTargetScriptXmlList serializes nested control stacks into Blockly XML", () => {
  const xmlList = buildCurrentTargetScriptXmlList(
    {
      targets: [
        {
          id: "sprite-a",
          name: "Cat",
          isStage: false,
          blocks: {
            hat: {
              opcode: "event_whenflagclicked",
              next: "repeat",
              parent: null,
              inputs: {},
              fields: {},
              shadow: false,
              topLevel: true
            },
            repeat: {
              opcode: "control_repeat",
              next: null,
              parent: "hat",
              inputs: {
                TIMES: [1, [4, "10"]],
                SUBSTACK: [2, "move"]
              },
              fields: {},
              shadow: false,
              topLevel: false
            },
            move: {
              opcode: "motion_movesteps",
              next: null,
              parent: "repeat",
              inputs: {
                STEPS: [1, [4, "10"]]
              },
              fields: {},
              shadow: false,
              topLevel: false
            }
          }
        }
      ]
    },
    {
      id: "sprite-a",
      name: "Cat"
    }
  );

  assert.equal(xmlList.length, 1);
  assert.match(xmlList[0], /<block[^>]+type="event_whenflagclicked"/);
  assert.match(xmlList[0], /<next>\s*<block[^>]+type="control_repeat"/);
  assert.match(xmlList[0], /<statement name="SUBSTACK">/);
  assert.match(xmlList[0], /<block[^>]+type="motion_movesteps"/);
  assert.match(xmlList[0], /<shadow type="math_number">/);
  assert.match(xmlList[0], /<field name="NUM">10<\/field>/);
});

test("buildRecommendedBlockXml creates official block XML with default inputs", () => {
  const sayXml = buildRecommendedBlockXml({
    opcode: "looks_sayforsecs",
    category: "外观",
    label: "说 2 秒",
    reason: "给脚本一个更直观的反馈。",
    example: "开始跑啦"
  });
  const waitXml = buildRecommendedBlockXml({
    opcode: "control_wait",
    category: "控制",
    label: "等待",
    reason: "让动作节奏慢一点。"
  });

  assert.match(sayXml, /<block[^>]+type="looks_sayforsecs"/);
  assert.match(sayXml, /<value name="SECS">/);
  assert.match(sayXml, /<field name="NUM">2<\/field>/);
  assert.match(sayXml, /<field name="TEXT">开始跑啦<\/field>/);

  assert.match(waitXml, /<block[^>]+type="control_wait"/);
  assert.match(waitXml, /<value name="DURATION">/);
  assert.match(waitXml, /<field name="NUM">1<\/field>/);
});
