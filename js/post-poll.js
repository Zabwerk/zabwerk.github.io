// 文章投票功能 - MongoDB Atlas 在线统计
(function() {
  'use strict';

  // API 基础 URL（需要替换为你部署的 Vercel API 地址）
  // 本地开发时使用 localhost
  const API_BASE_URL = window.location.origin.includes('localhost')
    ? 'http://localhost:3000/api/poll'
    : 'https://blog-poll-api.vercel.app/api/poll';

  // 选项颜色
  const optionColors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];

  // 渲染 LaTeX 公式
  const renderMathInPoll = (container) => {
    if (typeof katex !== 'undefined') {
      container.querySelectorAll('.math.inline').forEach(el => {
        const tex = el.textContent;
        try {
          katex.render(tex, el, { throwOnError: false, displayMode: false });
        } catch (e) { console.error('KaTeX render error:', e); }
      });
      container.querySelectorAll('.math.display').forEach(el => {
        const tex = el.textContent;
        try {
          katex.render(tex, el, { throwOnError: false, displayMode: true });
        } catch (e) { console.error('KaTeX render error:', e); }
      });
    } else if (typeof MathJax !== 'undefined') {
      if (MathJax.typesetPromise) {
        MathJax.startup.promise.then(() => {
          MathJax.typesetPromise([container]).catch(err => console.error('MathJax typeset error:', err));
        });
      } else if (MathJax.Hub) {
        MathJax.Hub.Queue(['Typeset', MathJax.Hub, container]);
      }
    }
  };

  // 从 API 获取投票数据
  const fetchPollData = async (pollId) => {
    try {
      const response = await fetch(`${API_BASE_URL}?pollId=${encodeURIComponent(pollId)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('获取投票数据失败:', err);
      // 如果 API 失败，返回空数据
      return { votes: {}, total: 0 };
    }
  };

  // 提交投票到 API
  const submitVote = async (pollId, optionId) => {
    try {
      console.log('正在提交投票:', { pollId, optionId });

      const response = await fetch(`${API_BASE_URL}?pollId=${encodeURIComponent(pollId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ optionId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('投票提交成功:', data);
      return { success: true, data: data.data };
    } catch (err) {
      console.error('提交投票失败:', err);
      alert('投票失败: ' + (err.message || '请检查网络连接'));
      return { success: false };
    }
  };

  // 初始化文章投票
  const initPostPolls = async () => {
    const pollContainers = document.querySelectorAll('.post-poll-container');

    pollContainers.forEach(async container => {
      const pollOptions = container.querySelector('.post-poll-options');
      if (!pollOptions) return;

      const pollId = pollOptions.dataset.pollId;
      if (!pollId) return;

      // 渲染 LaTeX
      renderMathInPoll(container);

      // 检查用户是否已投票
      const storageKey = `post_poll_voted_${pollId}`;
      const hasVoted = localStorage.getItem(storageKey);

      // 获取投票数据
      let pollData = await fetchPollData(pollId);
      pollData.userVote = hasVoted;

      const options = pollOptions.querySelectorAll('.post-poll-option');

      // 设置选项颜色并绑定事件
      options.forEach((option, index) => {
        const optionId = option.dataset.option;
        const color = optionColors[index % optionColors.length];
        option.dataset.color = color;

        // 如果已投票，禁用点击并显示结果
        if (hasVoted) {
          option.classList.add('voted');
          option.style.pointerEvents = 'none';
          option.style.cursor = 'not-allowed';
          return;
        }

        // 点击事件
        option.addEventListener('click', async () => {
          // 禁用按钮防止重复点击
          option.style.pointerEvents = 'none';
          option.style.opacity = '0.6';

          // 提交投票
          const result = await submitVote(pollId, optionId);
          if (!result.success) {
            // 恢复按钮状态
            option.style.pointerEvents = '';
            option.style.opacity = '';
            return;
          }

          // 标记已投票
          localStorage.setItem(storageKey, optionId);

          // 禁用所有选项
          options.forEach(opt => {
            opt.classList.add('voted');
            opt.style.pointerEvents = 'none';
            opt.style.cursor = 'not-allowed';
          });

          // 更新投票数据并显示结果
          pollData = result.data || await fetchPollData(pollId);
          pollData.userVote = optionId;
          showResult(container, pollData, options);

          // 隐藏投票选项，显示结果
          pollOptions.style.display = 'none';

          // 显示成功提示
          alert('投票成功！');
        });
      });

      // 如果已投票，显示结果并隐藏选项
      if (hasVoted) {
        pollOptions.style.display = 'none';
        showResult(container, pollData, options);
      }
    });
  };

  // 显示投票结果
  const showResult = (container, pollData, options) => {
    const resultContainer = container.querySelector('.post-poll-result');
    if (!resultContainer) return;

    const total = pollData.total || 0;

    let resultHTML = '<div class="result-title">📊 投票结果</div><div class="result-bars">';

    options.forEach((option, index) => {
      const optionId = option.dataset.option;
      const votes = pollData.votes[optionId] || 0;
      const percentage = total > 0 ? ((votes / total) * 100) : 0;
      const barHeight = Math.max(percentage, 5); // 最小高度 5% 以便显示
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
            <span class="result-votes">${votes}人</span>
            <span class="result-percent">${percentage.toFixed(1)}%</span>
          </div>
        </div>
      `;
    });

    resultHTML += '</div>';
    resultHTML += `<div class="result-total">共 ${total} 人参与投票</div>`;

    resultContainer.innerHTML = resultHTML;
    resultContainer.classList.add('show');
    resultContainer.style.display = 'block';

    // 显示投票后的文字内容
    const resultTextContainer = container.querySelector('.post-poll-result-text');
    if (resultTextContainer) {
      resultTextContainer.style.display = 'block';
      resultTextContainer.classList.add('show');
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
