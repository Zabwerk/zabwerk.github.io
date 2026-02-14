// 文章投票功能
(function() {
  'use strict';

  // 选项颜色
  const optionColors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];

  // 渲染 LaTeX 公式
  const renderMathInPoll = (container) => {
    // 检查是否有 KaTeX
    if (typeof katex !== 'undefined') {
      container.querySelectorAll('.math.inline').forEach(el => {
        const tex = el.textContent;
        try {
          katex.render(tex, el, {
            throwOnError: false,
            displayMode: false
          });
        } catch (e) {
          console.error('KaTeX render error:', e);
        }
      });
      container.querySelectorAll('.math.display').forEach(el => {
        const tex = el.textContent;
        try {
          katex.render(tex, el, {
            throwOnError: false,
            displayMode: true
          });
        } catch (e) {
          console.error('KaTeX render error:', e);
        }
      });
    }
    // 检查是否有 MathJax
    else if (typeof MathJax !== 'undefined') {
      if (MathJax.typesetPromise) {
        // 等待 MathJax 就绪后渲染
        MathJax.startup.promise.then(() => {
          MathJax.typesetPromise([container]).catch((err) => {
            console.error('MathJax typeset error:', err);
          });
        });
      } else if (MathJax.Hub) {
        MathJax.Hub.Queue(['Typeset', MathJax.Hub, container]);
      }
    }
  };

  // 初始化文章投票
  const initPostPolls = () => {
    const pollContainers = document.querySelectorAll('.post-poll-container');
    
    pollContainers.forEach(container => {
      const pollOptions = container.querySelector('.post-poll-options');
      if (!pollOptions) return;

      const pollId = pollOptions.dataset.pollId;
      if (!pollId) return;

      // 渲染 LaTeX
      renderMathInPoll(container);

      // 从 localStorage 读取投票数据
      const storageKey = `post_poll_${pollId}`;
      const savedData = localStorage.getItem(storageKey);
      let pollData = savedData ? JSON.parse(savedData) : { votes: {}, total: 0, userVote: null };

      const options = pollOptions.querySelectorAll('.post-poll-option');
      
      // 设置选项颜色并绑定事件
      options.forEach((option, index) => {
        const optionId = option.dataset.option;
        const color = optionColors[index % optionColors.length];
        option.dataset.color = color;

        // 更新显示
        updateOptionDisplay(option, pollData);

        // 点击事件
        option.addEventListener('click', () => {
          if (pollData.userVote) return;

          // 记录投票
          pollData.votes[optionId] = (pollData.votes[optionId] || 0) + 1;
          pollData.total++;
          pollData.userVote = optionId;

          // 保存
          localStorage.setItem(storageKey, JSON.stringify(pollData));

          // 更新显示
          options.forEach(opt => {
            updateOptionDisplay(opt, pollData);
            opt.classList.add('voted');
          });

          // 显示结果
          showResult(container, pollData, options);
        });
      });

      // 如果已投票，显示结果
      if (pollData.userVote) {
        options.forEach(opt => opt.classList.add('voted'));
        showResult(container, pollData, options);
      }
    });
  };

  // 更新选项显示
  const updateOptionDisplay = (option, pollData) => {
    const optionId = option.dataset.option;
    const votes = pollData.votes[optionId] || 0;
    
    const countSpan = option.querySelector('.poll-count');
    if (countSpan) {
      countSpan.textContent = `${votes} 票`;
    }
  };

  // 显示投票结果
  const showResult = (container, pollData, options) => {
    const resultContainer = container.querySelector('.post-poll-result');
    if (!resultContainer) return;

    const total = pollData.total || 0;
    const maxVotes = Math.max(...Array.from(options).map(opt => pollData.votes[opt.dataset.option] || 0));

    let resultHTML = '<div class="result-title">📊 投票结果</div><div class="result-bars">';

    options.forEach((option, index) => {
      const optionId = option.dataset.option;
      const votes = pollData.votes[optionId] || 0;
      const percentage = total > 0 ? ((votes / total) * 100).toFixed(1) : 0;
      const barHeight = maxVotes > 0 ? (votes / maxVotes * 100) : 0;
      const label = String.fromCharCode(65 + index);
      const color = option.dataset.color;
      const isSelected = pollData.userVote === optionId;

      resultHTML += `
        <div class="result-item ${isSelected ? 'selected' : ''}">
          <div class="result-bar-wrapper">
            <div class="result-bar" style="height: ${barHeight}%; background-color: ${color};"></div>
          </div>
          <div class="result-info">
            <span class="result-label">${label}</span>
            <span class="result-votes">${votes}票</span>
            <span class="result-percent">${percentage}%</span>
          </div>
        </div>
      `;
    });

    resultHTML += '</div>';
    resultHTML += `<div class="result-total">共 ${total} 人参与投票</div>`;

    resultContainer.innerHTML = resultHTML;
    resultContainer.classList.add('show');

    // 显示投票后的文字内容
    const resultTextContainer = container.querySelector('.post-poll-result-text');
    if (resultTextContainer) {
      resultTextContainer.style.display = 'block';
      resultTextContainer.classList.add('show');
      // 渲染 LaTeX
      renderMathInPoll(resultTextContainer);
    }
  };

  // 初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPostPolls);
  } else {
    initPostPolls();
  }

  // 支持 PJAX
  window.addEventListener('pjax:complete', initPostPolls);
})();
