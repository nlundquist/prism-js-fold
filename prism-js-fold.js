// inspects code elements from prism during pre-render hook. if it's JS or JSON we try to insert details/summary tags to
// allow code folding

const lastLineWrapperOpen = "<span class='ll'>".split() // wrap portion of last line preceding the closing symbol so we can conditionally hide it, needed to make non-square hidden regions collapse nicely.
const lastLineWrapperClose = "</span>".split()
const firstLineContentWrapperOpen = "<span class='fl'>".split() // wrapper beginning at first **visible** character on first line where opening symbol is found. needed so we can align opening toggle nicely
const firstLineContentWrapperClose = "</span>".split()
const detailsOpenFragmentActive = "<details open><summary>".split()
const detailsOpenFragmentInactive = "<details><summary>".split()
const summaryCloseFragment = "</summary>".split()
const detailsCloseFragment = "</details>".split()

const symbolPairMap = {
  '{': '}',
  '[': ']'
}

// folding `context` type contains:
//  - minimumDepth:int - depth value that must be met or exceeded for folding to occur

function insertFold(inputBuffer, depth, context) {
  const output = []
  let remaining = inputBuffer
  let current

  function createFold(symbol) {
    const [result, resultRemaining] = insertFold(remaining, depth + 1, context)
    const currentLineEndIndex = result.indexOf('\n')
    // only create fold if symbol pair crossed a '\n'. only insert fold if at required depth.
    if (currentLineEndIndex >= 0 && depth >= context.minimumDepth) {
      const currentLineStartIndex = output.lastIndexOf('\n')
      const currentLineStart = output.splice(currentLineStartIndex + 1)
      const currentLineCharacterStartIndex = currentLineStart.findIndex((c) => /[^\s]{1}/.test(c))
      const currentLineStartWhiteSpace = currentLineStart.splice(0, currentLineCharacterStartIndex)
      const currentLineEnd = result.splice(0, currentLineEndIndex)
      const resultLastLineIndex = result.lastIndexOf('\n')
      const resultLastLine = result.splice(resultLastLineIndex + 1)
      output.push(
        ...(context.lineCount >= 40 ? detailsOpenFragmentInactive : detailsOpenFragmentActive),
        ...currentLineStartWhiteSpace,
        ...firstLineContentWrapperOpen,
        ...currentLineStart,
        ...currentLineEnd,
        ...firstLineContentWrapperClose,
        ...summaryCloseFragment,
        ...result,
        ...detailsCloseFragment,
        ...lastLineWrapperOpen,
        ...resultLastLine,
        ...lastLineWrapperClose,
        symbolPairMap[symbol]
      )
      remaining = resultRemaining
    } else {
      output.push(...result, symbolPairMap[symbol])
      remaining = resultRemaining
    }
  }

  while ((current = remaining.shift()) !== undefined) {
    switch (current) {
      case '[':
      case '{':
        output.push(current)
        createFold(current);
        break;
      case ']':
      case '}':
        return [output, remaining]
      default:
        output.push(current)
    }
  }

  return [output, remaining]
}

// takes a code element and begins recursion if it's a parsable format
function insertFolds(codeElement) {
  const parseable = Array.from(codeElement.classList).find(
    (cls) => cls.endsWith('json') || cls.endsWith('js') || cls.endsWith('javascript')
  ) !== undefined

  if (parseable) {
    const inputBuffer = codeElement.innerText.split('')
    const [result] = insertFold(inputBuffer, 1, {
      minimumDepth: 2,
      lineCount: inputBuffer.filter((c) => c === '\n').length
    })
    codeElement.innerHTML = result.join('')
  }
}

if (Prism) {
  Prism.hooks.add('before-all-elements-highlight', ({ elements }) => elements.forEach(insertFolds))
} else {
  console.warn('prism-js-fold: Prism was not loaded so we could not add the Prism hook needed for code folding insertion.')
}