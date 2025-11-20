/**
 * 使用 crypto.getRandomValues 的安全隨機數生成
 */
function secureRandom() {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] / 0xFFFFFFFF;
}

/**
 * Fisher-Yates shuffle 使用 crypto 隨機
 */
function secureShuffle(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(secureRandom() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 安全隨機抽選（排除已中獎者）
 * @param {Array} participants - 參與者列表
 * @param {Set} excludedIds - 已中獎者ID集合
 * @param {number} count - 要抽取的數量
 * @param {boolean} ignoreWonStatus - 是否忽略 won 狀態（用於測試模式）
 * @returns {Array} 中獎者列表
 */
export function secureShuffleAndPick(participants, excludedIds, count = 1, ignoreWonStatus = false) {
  // 建立符合資格的列表（排除已中獎者）
  const eligible = participants.filter(p => {
    const id = String(p.id);
    
    // 檢查是否在排除列表中
    if (excludedIds.has(id)) {
      return false;
    }
    
    // 檢查報到狀態（1=已報到, 2=公差無法到場但可抽, 9=因公未到但可抽）
    if (p.checked_in !== 1 && p.checked_in !== 2 && p.checked_in !== 9) {
      return false;
    }
    
    // 檢查 won 狀態（雙重保險，確保不會選到已中獎者）
    // 但在測試模式下可以忽略此檢查
    if (!ignoreWonStatus && (p.won === true || p.won === 'TRUE')) {
      return false;
    }
    
    return true;
  });

  if (eligible.length === 0) {
    return [];
  }

  // 如果只需要選一個，直接使用隨機索引更公平
  if (count === 1) {
    const randomIndex = Math.floor(secureRandom() * eligible.length);
    return [eligible[randomIndex]];
  }

  // 多個選取時，使用改進的選取邏輯確保完全公平
  // 方法：每次選取都從剩餘的參與者中隨機選取，確保每個人都能被選中
  const selected = [];
  const selectedIds = new Set();
  const available = [...eligible]; // 可用參與者列表的副本
  
  for (let i = 0; i < count && available.length > 0; i++) {
    // 每次從剩餘的可用參與者中隨機選取一個
    const randomIndex = Math.floor(secureRandom() * available.length);
    const chosen = available[randomIndex];
    const chosenId = String(chosen.id);
    
    // 確保沒有重複 ID（雖然理論上不應該有，但為了安全）
    if (!selectedIds.has(chosenId)) {
      selectedIds.add(chosenId);
      selected.push(chosen);
      // 從可用列表中移除已選中的參與者（確保不重複）
      available.splice(randomIndex, 1);
    } else {
      // 如果遇到重複 ID，從可用列表中移除，但不加入選中列表
      available.splice(randomIndex, 1);
      i--; // 重試這次選取
    }
  }
  
  return selected;
}

/**
 * 批次抽選多個中獎者（確保不重複）
 * @param {Array} participants - 參與者列表
 * @param {Set} excludedIds - 已中獎者ID集合
 * @param {number} count - 要抽取的數量
 * @param {boolean} allowRepeat - 是否允許同一批次內重複
 * @returns {Array} 中獎者列表
 */
export function batchDraw(participants, excludedIds, count, allowRepeat = false) {
  if (allowRepeat) {
    // 可重複抽獎：允許同一批次內重複選取
    const eligible = participants.filter(p => {
      const id = String(p.id);
      
      // 檢查是否在排除列表中
      if (excludedIds.has(id)) {
        return false;
      }
      
      // 檢查報到狀態（1=已報到, 2=公差無法到場但可抽, 9=因公未到但可抽）
      if (p.checked_in !== 1 && p.checked_in !== 2 && p.checked_in !== 9) {
        return false;
      }
      
      // 可重複抽獎模式下，不檢查 won 狀態（允許已中獎者再次中獎）
      return true;
    });

    if (eligible.length === 0) {
      return [];
    }

    // 改善：每次選取都重新 shuffle，確保更均勻的隨機性
    // 這樣可以避免某些參與者因為位置固定而較少被選中
    const selected = [];
    for (let i = 0; i < count; i++) {
      // 每次選取前都重新 shuffle，確保完全隨機
      const shuffled = secureShuffle(eligible);
      // 使用隨機索引選取，允許重複
      const randomIndex = Math.floor(secureRandom() * shuffled.length);
      selected.push(shuffled[randomIndex]);
    }
    return selected;
  } else {
    // 不重複抽獎：使用原有的邏輯，確保同一批次內不重複
    // 注意：這裡不傳遞 ignoreWonStatus，保持原有行為
    return secureShuffleAndPick(participants, excludedIds, count, false);
  }
}


