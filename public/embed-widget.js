/**
 * Training Video Generator - Embed Widget
 * Use this script to integrate your tutorials into any website.
 */
(function () {
    window.TrainingGuide = {
        init: function (options) {
            const { guideUrl, triggerId, position = 'bottom-right' } = options;

            // Create Floating Button if requested
            if (triggerId) {
                const trigger = document.getElementById(triggerId);
                if (trigger) {
                    trigger.addEventListener('click', () => this.open(guideUrl));
                }
            } else {
                this.createFloatingButton(guideUrl, position);
            }
        },

        createFloatingButton: function (url, position) {
            const btn = document.createElement('button');
            btn.innerHTML = '❓ Help Guide';
            btn.style.position = 'fixed';
            btn.style.zIndex = '2147483647';
            btn.style.padding = '12px 20px';
            btn.style.backgroundColor = '#4f46e5';
            btn.style.color = '#fff';
            btn.style.border = 'none';
            btn.style.borderRadius = '9999px';
            btn.style.fontWeight = '700';
            btn.style.cursor = 'pointer';
            btn.style.boxShadow = '0 10px 25px -5px rgba(79, 70, 229, 0.4)';
            btn.style.transition = 'all 0.3s ease';

            if (position === 'bottom-right') {
                btn.style.bottom = '30px';
                btn.style.right = '30px';
            } else {
                btn.style.bottom = '30px';
                btn.style.left = '30px';
            }

            btn.onmouseover = () => btn.style.transform = 'translateY(-2px) scale(1.05)';
            btn.onmouseout = () => btn.style.transform = 'translateY(0) scale(1)';
            btn.onclick = () => this.open(url);

            document.body.appendChild(btn);
        },

        open: function (url) {
            // Create Overlay
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100vw';
            overlay.style.height = '100vh';
            overlay.style.backgroundColor = 'rgba(2, 6, 23, 0.9)';
            overlay.style.zIndex = '2147483648';
            overlay.style.display = 'flex';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.backdropFilter = 'blur(8px)';
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.4s ease';

            const container = document.createElement('div');
            container.style.width = '90%';
            container.style.height = '85%';
            container.style.backgroundColor = '#020617';
            container.style.borderRadius = '32px';
            container.style.overflow = 'hidden';
            container.style.position = 'relative';
            container.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.5)';
            container.style.border = '1px solid rgba(255, 255, 255, 0.1)';

            const iframe = document.createElement('iframe');
            iframe.src = url;
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = 'none';

            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '✕';
            closeBtn.style.position = 'absolute';
            closeBtn.style.top = '20px';
            closeBtn.style.right = '20px';
            closeBtn.style.width = '40px';
            closeBtn.style.height = '40px';
            closeBtn.style.borderRadius = '50%';
            closeBtn.style.backgroundColor = 'rgba(255,255,255,0.1)';
            closeBtn.style.color = '#fff';
            closeBtn.style.border = 'none';
            closeBtn.style.cursor = 'pointer';
            closeBtn.style.fontSize = '18px';
            closeBtn.style.fontWeight = 'bold';
            closeBtn.style.zIndex = '10';
            closeBtn.onclick = () => {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 400);
            };

            container.appendChild(closeBtn);
            container.appendChild(iframe);
            overlay.appendChild(container);
            document.body.appendChild(overlay);

            // Fade in
            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
            });
        }
    };
})();
