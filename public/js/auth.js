/* ============================================
   AUTH.JS - Login & Registration Logic
   ============================================ */

const API_BASE = '';

// ==================== PASSWORD TOGGLE ====================
document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('togglePassword');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const passwordInput = document.getElementById('password');
            const eyeOpen = toggleBtn.querySelector('.eye-open');
            const eyeClosed = toggleBtn.querySelector('.eye-closed');

            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                eyeOpen.style.display = 'none';
                eyeClosed.style.display = 'block';
            } else {
                passwordInput.type = 'password';
                eyeOpen.style.display = 'block';
                eyeClosed.style.display = 'none';
            }
        });
    }

    // Pre-warm backend connection (wakes Render server if idle)
    try {
        fetch(`${API_BASE}/api/health`).catch(() => {});
    } catch (e) {}

    // Check if user is already logged in
    const currentUser = sessionStorage.getItem('currentUser');
    if (currentUser) {
        window.location.href = '/dashboard';
        return;
    }

    // ==================== LOGIN FORM ====================
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const errorDiv = document.getElementById('loginError');
            const btn = document.getElementById('loginBtn');
            const btnText = btn.querySelector('.btn-text');
            const btnLoader = btn.querySelector('.btn-loader');

            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;

            // Validation
            if (!username || !password) {
                showError(errorDiv, 'Please fill in all fields');
                return;
            }

            // Show loading
            btn.disabled = true;
            btnText.style.display = 'none';
            btnLoader.style.display = 'inline-flex';
            hideError(errorDiv);

            try {
                const response = await fetch(`${API_BASE}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Login failed');
                }

                // Store user in session
                sessionStorage.setItem('currentUser', JSON.stringify(data.user));
                if (data.user && data.user.profilePic) {
                    localStorage.setItem('userAvatar_' + (data.user.username || data.user.id), data.user.profilePic);
                    localStorage.setItem('userAvatar_' + data.user.id, data.user.profilePic);
                }

                // Remember me
                if (document.getElementById('rememberMe')?.checked) {
                    localStorage.setItem('rememberedUsername', username);
                } else {
                    localStorage.removeItem('rememberedUsername');
                }

                // Redirect to dashboard
                window.location.href = '/dashboard';

            } catch (error) {
                showError(errorDiv, error.message);
            } finally {
                btn.disabled = false;
                btnText.style.display = 'inline';
                btnLoader.style.display = 'none';
            }
        });

        // Auto-fill freshly registered username or remembered username
        const justRegistered = sessionStorage.getItem('justRegisteredUsername');
        const justRegisteredName = sessionStorage.getItem('justRegisteredFullName');
        if (justRegistered) {
            const userInput = document.getElementById('username');
            if (userInput) {
                userInput.value = justRegistered;
                const passInput = document.getElementById('password');
                if (passInput) passInput.focus();
            }
            if (justRegisteredName) {
                const infoDiv = document.getElementById('loginError');
                if (infoDiv) {
                    infoDiv.style.background = '#ecfdf5';
                    infoDiv.style.borderColor = '#a7f3d0';
                    infoDiv.style.color = '#065f46';
                    infoDiv.textContent = `✓ Account verified for ${justRegisteredName} (@${justRegistered}). Please enter your password to sign in.`;
                    infoDiv.style.display = 'block';
                }
            }
            sessionStorage.removeItem('justRegisteredUsername');
            sessionStorage.removeItem('justRegisteredFullName');
        } else {
            const remembered = localStorage.getItem('rememberedUsername');
            if (remembered) {
                document.getElementById('username').value = remembered;
                document.getElementById('rememberMe').checked = true;
            }
        }
    }

    // ==================== REGISTER FORM ====================
    let selectedRegisterAvatar = '';

    const registerAvatarInput = document.getElementById('registerProfilePic');
    if (registerAvatarInput) {
        registerAvatarInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            if (file.size > 5 * 1024 * 1024) {
                const errorDiv = document.getElementById('registerError');
                showError(errorDiv, 'Profile image size must be less than 5MB');
                registerAvatarInput.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const size = Math.min(img.width, img.height);
                    const targetSize = Math.min(size, 200);
                    canvas.width = targetSize;
                    canvas.height = targetSize;
                    const ctx = canvas.getContext('2d');
                    const sx = (img.width - size) / 2;
                    const sy = (img.height - size) / 2;
                    ctx.drawImage(img, sx, sy, size, size, 0, 0, targetSize, targetSize);
                    selectedRegisterAvatar = canvas.toDataURL('image/jpeg', 0.82);

                    const previewEl = document.getElementById('registerAvatarPreview');
                    if (previewEl) {
                        previewEl.innerHTML = `<img src="${selectedRegisterAvatar}" alt="Profile Preview" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                    }
                    const removeBtn = document.getElementById('registerAvatarRemoveBtn');
                    if (removeBtn) removeBtn.style.display = 'inline-block';
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    window.clearRegisterAvatar = function () {
        selectedRegisterAvatar = '';
        if (registerAvatarInput) registerAvatarInput.value = '';
        const previewEl = document.getElementById('registerAvatarPreview');
        if (previewEl) {
            previewEl.innerHTML = `
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                </svg>`;
        }
        const removeBtn = document.getElementById('registerAvatarRemoveBtn');
        if (removeBtn) removeBtn.style.display = 'none';
    };

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        // Password strength checker
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.addEventListener('input', () => {
                updatePasswordStrength(passwordInput.value);
            });
        }

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const errorDiv = document.getElementById('registerError');
            const successDiv = document.getElementById('registerSuccess');
            const btn = document.getElementById('registerBtn');
            const btnText = btn.querySelector('.btn-text');
            const btnLoader = btn.querySelector('.btn-loader');

            const firstName = document.getElementById('firstName').value.trim();
            const lastName = document.getElementById('lastName').value.trim();
            const username = document.getElementById('username').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const role = document.querySelector('input[name="role"]:checked')?.value;

            // Validation
            if (!firstName || !lastName || !username || !email || !password || !confirmPassword) {
                showError(errorDiv, 'Please fill in all fields');
                return;
            }

            if (password.length < 6) {
                showError(errorDiv, 'Password must be at least 6 characters');
                return;
            }

            if (password !== confirmPassword) {
                showError(errorDiv, 'Passwords do not match');
                return;
            }

            if (!role) {
                showError(errorDiv, 'Please select a role');
                return;
            }

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showError(errorDiv, 'Please enter a valid email address');
                return;
            }

            const privacyConsent = document.getElementById('privacyConsent');
            if (privacyConsent && !privacyConsent.checked) {
                showError(errorDiv, 'Please agree to the Privacy Policy & Academic Integrity Guidelines to register');
                return;
            }

            // Show loading
            btn.disabled = true;
            btnText.style.display = 'none';
            btnLoader.style.display = 'inline-flex';
            hideError(errorDiv);
            hideSuccess(successDiv);

            try {
                const response = await fetch(`${API_BASE}/api/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        username, 
                        email, 
                        password, 
                        firstName, 
                        lastName, 
                        role,
                        profilePic: selectedRegisterAvatar || ''
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Registration failed');
                }

                // Store registered username to auto-populate login
                sessionStorage.setItem('justRegisteredUsername', username);
                sessionStorage.setItem('justRegisteredFullName', `${firstName} ${lastName}`);
                if (selectedRegisterAvatar) {
                    localStorage.setItem('userAvatar_' + username, selectedRegisterAvatar);
                    if (data.user && data.user.id) {
                        localStorage.setItem('userAvatar_' + data.user.id, selectedRegisterAvatar);
                    }
                }

                // Show success
                showSuccess(successDiv, `Account created for ${firstName} ${lastName} (@${username})! Redirecting to login...`);
                registerForm.reset();
                window.clearRegisterAvatar();

                // Redirect after 1.5 seconds
                setTimeout(() => {
                    window.location.href = '/login';
                }, 1500);

            } catch (error) {
                showError(errorDiv, error.message);
            } finally {
                btn.disabled = false;
                btnText.style.display = 'inline';
                btnLoader.style.display = 'none';
            }
        });
    }
});

// ==================== HELPER FUNCTIONS ====================

function showError(element, message) {
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
        // Auto-hide after 5 seconds
        setTimeout(() => hideError(element), 5000);
    }
}

function hideError(element) {
    if (element) {
        element.style.display = 'none';
    }
}

function showSuccess(element, message) {
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
    }
}

function hideSuccess(element) {
    if (element) {
        element.style.display = 'none';
    }
}

function updatePasswordStrength(password) {
    const fill = document.getElementById('strengthFill');
    const text = document.getElementById('strengthText');

    if (!fill || !text) return;

    let strength = 0;
    let label = '';
    let color = '';

    if (password.length === 0) {
        fill.style.width = '0%';
        text.textContent = '';
        return;
    }

    // Check strength criteria
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    switch (true) {
        case (strength <= 1):
            label = 'Weak';
            color = '#ef4444';
            break;
        case (strength <= 2):
            label = 'Fair';
            color = '#f59e0b';
            break;
        case (strength <= 3):
            label = 'Good';
            color = '#3b82f6';
            break;
        default:
            label = 'Strong';
            color = '#10b981';
    }

    fill.style.width = `${(strength / 5) * 100}%`;
    fill.style.backgroundColor = color;
    text.textContent = label;
    text.style.color = color;
}
