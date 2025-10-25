// Lecture Learning Page JavaScript
class LectureLearning {
    constructor() {
        this.player = null;
        this.currentVideoId = null;
        this.progressInterval = null;
        this.isInitialized = false;
        this.init();
    }

    async init() {
        try {
            await this.initPlayer();
            this.bindEvents();
            this.loadFirstVideo();
            this.isInitialized = true;
            console.log('LectureLearning initialized successfully');
        } catch (error) {
            console.error('Failed to initialize LectureLearning:', error);
            this.showError('Không thể khởi tạo trình phát video');
        }
    }

    async initPlayer() {
        const videoElement = document.getElementById('player');
        if (!videoElement) {
            console.log('No video element found, skipping player initialization');
            return;
        }

        try {
            // Hủy player cũ nếu có
            if (this.player) {
                this.player.destroy();
                this.player = null;
            }

            // Khởi tạo Plyr player
            this.player = new Plyr('#player', {
                controls: [
                    'play-large',
                    'play',
                    'progress',
                    'current-time',
                    'duration',
                    'mute',
                    'volume',
                    'settings',
                    'fullscreen'
                ],
                settings: ['quality', 'speed'],
                quality: {
                    default: 720,
                    options: [1080, 720, 480, 360]
                },
                speed: {
                    selected: 1,
                    options: [0.5, 0.75, 1, 1.25, 1.5, 2]
                }
            });

            this.bindPlayerEvents();
            console.log('Player initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Plyr player:', error);
            throw error;
        }
    }

    bindPlayerEvents() {
        this.player.on('ready', () => {
            console.log('Player ready');
            // Load progress cho video hiện tại nếu có
            if (this.currentVideoId) {
                this.loadVideoProgress(this.currentVideoId);
            }
        });

        this.player.on('play', () => {
            console.log('Video started playing');
            this.startProgressTracking();
        });

        this.player.on('pause', () => {
            console.log('Video paused');
            this.stopProgressTracking();
            this.saveVideoProgress();
        });

        this.player.on('ended', () => {
            console.log('Video ended');
            this.markVideoCompleted();
        });

        this.player.on('timeupdate', () => {
            this.checkVideoCompletion();
        });

        this.player.on('error', (event) => {
            console.error('Player error:', event);
            this.showError('Lỗi khi phát video: ' + event.detail.message);
        });

        this.player.on('loadstart', () => {
            console.log('Video loading started');
        });

        this.player.on('loadeddata', () => {
            console.log('Video data loaded');
        });

        this.player.on('canplay', () => {
            console.log('Video can start playing');
        });

        this.player.on('waiting', () => {
            console.log('Video is waiting for data');
        });

        this.player.on('stalled', () => {
            console.log('Video stalled');
            this.showError('Video bị treo, đang thử tải lại...');
        });
    }

    bindEvents() {
        // Xử lý click vào video trong danh sách
        document.querySelectorAll('.video-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchVideo(item);
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (!this.player) return;
            
            switch(e.code) {
                case 'Space':
                    e.preventDefault();
                    this.player.togglePlay();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.player.rewind(10);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.player.forward(10);
                    break;
                case 'KeyF':
                    e.preventDefault();
                    this.player.toggleFullscreen();
                    break;
            }
        });
    }

    loadFirstVideo() {
        const firstVideo = document.querySelector('.video-item.active');
        if (firstVideo) {
            this.currentVideoId = firstVideo.dataset.videoId;
            console.log('Loading first video:', this.currentVideoId);
            
            // Chỉ load progress nếu player đã sẵn sàng
            if (this.player && this.player.ready) {
                this.loadVideoProgress(this.currentVideoId);
            } else if (this.player) {
                // Đợi player ready
                this.player.once('ready', () => {
                    this.loadVideoProgress(this.currentVideoId);
                });
            }
        } else {
            console.warn('No active video item found');
        }
    }

    switchVideo(videoItem) {
        const videoId = videoItem.dataset.videoId;
        const videoUrl = videoItem.dataset.videoUrl;
        const videoTitle = videoItem.dataset.videoTitle;

        if (!videoId || !videoUrl) {
            console.error('Missing videoId or videoUrl:', { videoId, videoUrl, videoItem });
            this.showError('Thông tin video không đầy đủ');
            return;
        }

        console.log('Switching to video:', { videoId, videoUrl, videoTitle });

        // Debug trạng thái trước khi switch
        this.debugPlayerState();

        // Cập nhật active state
        document.querySelectorAll('.video-item').forEach(v => v.classList.remove('active'));
        videoItem.classList.add('active');

        // Cập nhật currentVideoId trước
        this.currentVideoId = videoId;

        // Thay đổi video source nếu có player
        if (this.player) {
            try {
                // Dừng video hiện tại
                this.player.pause();
                
                // Cập nhật source
                this.player.source = {
                    type: 'video',
                    sources: [{
                        src: videoUrl,
                        type: 'video/mp4'
                    }]
                };

                // Load video progress sau khi source được cập nhật
                setTimeout(() => {
                    this.loadVideoProgress(videoId);
                    // Debug trạng thái sau khi switch
                    console.log('After switching video:');
                    this.debugPlayerState();
                }, 500);

            } catch (error) {
                console.error('Error switching video:', error);
                this.showError('Lỗi khi chuyển video');
            }
        } else {
            console.warn('Player not initialized, cannot switch video');
            this.showError('Trình phát video chưa sẵn sàng');
        }
    }

    startProgressTracking() {
        this.progressInterval = setInterval(() => {
            this.saveVideoProgress();
        }, 10000); // Mỗi 10 giây
    }

    stopProgressTracking() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }

    checkVideoCompletion() {
        if (!this.player) return;
        
        const currentTime = this.player.currentTime;
        const duration = this.player.duration;
        
        // Kiểm tra nếu đã xem 90% video thì đánh dấu hoàn thành
        if (duration > 0 && (currentTime / duration) >= 0.9) {
            this.markVideoCompleted();
        }
    }

    async saveVideoProgress() {
        if (!this.currentVideoId || !this.player) return;

        const currentTime = this.player.currentTime;
        const duration = this.player.duration;
        const isCompleted = (currentTime / duration) >= 0.9;

        try {
            const response = await fetch('/courses/video-progress', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    videoId: this.currentVideoId,
                    currentTime: currentTime,
                    duration: duration,
                    isCompleted: isCompleted
                })
            });

            const data = await response.json();
            if (data.success) {
                console.log('Progress saved:', data.message);
            }
        } catch (error) {
            console.error('Error saving progress:', error);
        }
    }

    async loadVideoProgress(videoId) {
        if (!videoId) {
            console.warn('No videoId provided to loadVideoProgress');
            return;
        }

        try {
            const response = await fetch(`/courses/video-progress/${videoId}`);
            const data = await response.json();

            if (data.success && data.progress && data.progress.current_time > 0 && this.player) {
                // Đợi player sẵn sàng trước khi set currentTime
                if (this.player.ready) {
                    this.player.currentTime = data.progress.current_time;
                    console.log(`Restored video progress for video ${videoId} to ${data.progress.current_time}s`);
                } else {
                    // Nếu player chưa ready, đợi event ready
                    this.player.once('ready', () => {
                        this.player.currentTime = data.progress.current_time;
                        console.log(`Restored video progress for video ${videoId} to ${data.progress.current_time}s`);
                    });
                }
            } else {
                console.log(`No progress found for video ${videoId}`);
            }
        } catch (error) {
            console.error('Error loading progress:', error);
            // Không hiển thị error toast cho việc load progress vì không quan trọng
        }
    }

    async markVideoCompleted() {
        if (!this.currentVideoId || !this.player) return;

        try {
            const response = await fetch('/courses/video-progress', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    videoId: this.currentVideoId,
                    currentTime: this.player.duration,
                    duration: this.player.duration,
                    isCompleted: true
                })
            });

            const data = await response.json();
            if (data.success) {
                console.log('Video marked as completed');
                this.updateVideoStatus(this.currentVideoId, 'completed');
            }
        } catch (error) {
            console.error('Error marking video completed:', error);
        }
    }

    updateVideoStatus(videoId, status) {
        const videoItem = document.querySelector(`[data-video-id="${videoId}"]`);
        if (videoItem) {
            const statusIcon = videoItem.querySelector('.video-status i');
            
            // Remove existing status classes
            videoItem.classList.remove('completed', 'in-progress');
            
            if (status === 'completed') {
                videoItem.classList.add('completed');
                statusIcon.className = 'fas fa-check-circle text-success';
            } else if (status === 'in-progress') {
                videoItem.classList.add('in-progress');
                statusIcon.className = 'fas fa-play-circle text-warning';
            }
        }
    }

    // Utility methods
    showError(message) {
        this.showToast(message, 'error');
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `alert alert-${type === 'success' ? 'success' : 'danger'} position-fixed top-0 start-50 translate-middle-x mt-3`;
        toast.style.zIndex = '9999';
        toast.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // Debug method để kiểm tra trạng thái
    debugPlayerState() {
        console.log('=== Player Debug Info ===');
        console.log('Player exists:', !!this.player);
        console.log('Player ready:', this.player ? this.player.ready : false);
        console.log('Current video ID:', this.currentVideoId);
        console.log('Progress interval:', !!this.progressInterval);
        if (this.player) {
            console.log('Current time:', this.player.currentTime);
            console.log('Duration:', this.player.duration);
            console.log('Paused:', this.player.paused);
        }
        console.log('========================');
    }

    // Cleanup method
    destroy() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }
        if (this.player) {
            this.player.destroy();
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new LectureLearning();
});
