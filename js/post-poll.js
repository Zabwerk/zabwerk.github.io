// 文章投票功能 - 集成 Supabase
(function() {
  'use strict';

  // Supabase 配置
  const SUPABASE_URL = 'https://uiaovtdpkqrdajbwqcgm.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpYW92dGRwa3FyZGFqYndxY2dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMzc3NTMsImV4cCI6MjA4NjYxMzc1M30.b4qwi_0aYHMd8ISIv7nu3NGBko7d5zvxcywRjCILaYc';

  // 选项颜色
  const optionColors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];

  // Supabase 客户端
  let supabaseClient = null;

  // 初始化 Supabase
  const initSupabase = async () => {
    if (supabaseClient) return supabaseClient;
    
    // 动态加载 Supabase 客户端
    if (typeof supabase === 'undefined') {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    return supabaseClient;
  };

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

  // 从 Supabase 获取投票数据
  const fetchPollData = async (pollId) => {
    try {
      const client = await initSupabase();
      const { data, error } = await client
        .from('polls')
        .select('option_id')
        .eq('poll_id', pollId);
      
      if (error) throw error;
      
      // 统计数据
      const votes = {};
      let total = 0;
      data.forEach(row => {
        votes[row.option_id] = (votes[row.option_id] || 0) + 1;
        total++;
      });
      
      return { votes, total };
    } catch (err) {
      console.error('Fetch poll data error:', err);
      return { votes: {}, total: 0 };
    }
  };

  // 提交投票到 Supabase
  const submitVote = async (pollId, optionId) => {
    try {
      const client = await initSupabase();
      const { error } = await client
        .from('polls')
        .insert([{ poll_id: pollId, option_id: optionId }]);
      
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Submit vote error:', err);
      return false;
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

        // 如果已投票，禁用点击
        if (hasVoted) {
          option.classList.add('voted');
          option.style.pointerEvents = 'none';
          option.style.cursor = 'not-allowed';
          return;
        }

        // 点击事件
        option.addEventListener('click', async () => {
          // 提交投票
          const success = await submitVote(pollId, optionId);
          if (!success) {
            alert('答题失败，请重试');
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

          // 显示成功提示
          alert('答题成功！');

          // 刷新页面
          window.location.reload();
        });
      });

      // 如果已投票，显示结果
      if (hasVoted) {
        showResult(container, pollData, options);
      }
    });
  };

  // 显示投票结果
  const showResult = (container, pollData, options) => {
    const resultContainer = container.querySelector('.post-poll-result');
    if (!resultContainer) return;

    const total = pollData.total || 0;

    let resultHTML = '<div class="result-title">📊 答题情况</div><div class="result-bars">';

    options.forEach((option, index) => {
      const optionId = option.dataset.option;
      const votes = pollData.votes[optionId] || 0;
      const percentage = total > 0 ? ((votes / total) * 100) : 0;
      const barHeight = percentage;
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
    resultHTML += `<div class="result-total">共 ${total} 人参与答题</div>`;

    resultContainer.innerHTML = resultHTML;
    resultContainer.classList.add('show');

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
