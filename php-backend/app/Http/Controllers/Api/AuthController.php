<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Tymon\JWTAuth\Facades\JWTAuth;
use Tymon\JWTAuth\Exceptions\JWTException;

class AuthController extends Controller
{
    /**
     * Register a new user
     */
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:50',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6|confirmed',
            'referral_code' => 'nullable|string|exists:users,referral_code'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator);
        }

        try {
            // Handle referral
            $referredBy = null;
            if ($request->referral_code) {
                $referrer = User::where('referral_code', $request->referral_code)->first();
                if ($referrer) {
                    $referredBy = $referrer->id;
                    // Give referral bonus
                    $referrer->addEarnings(50000, 'available'); // Rp 50,000 referral bonus
                }
            }

            // Create user
            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'referred_by' => $referredBy,
                'verification_token' => Str::random(60),
                'preferences' => [
                    'notifications' => [
                        'email' => true,
                        'push' => true,
                        'sms' => false
                    ],
                    'currency' => 'IDR',
                    'language' => 'id',
                    'timezone' => 'Asia/Jakarta'
                ]
            ]);

            // Generate JWT token
            $token = JWTAuth::fromUser($user);

            // Send verification email (implement later)
            // Mail::to($user->email)->send(new VerificationEmail($user));

            return $this->successResponse([
                'user' => $user->makeHidden(['verification_token']),
                'token' => $token,
                'token_type' => 'bearer',
                'expires_in' => config('jwt.ttl') * 60
            ], 'Registrasi berhasil! Silakan cek email untuk verifikasi.', 201);

        } catch (\Exception $e) {
            return $this->errorResponse('Registrasi gagal: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Login user
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string|min:6'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator);
        }

        $credentials = $request->only('email', 'password');

        try {
            if (!$token = JWTAuth::attempt($credentials)) {
                return $this->errorResponse('Email atau password salah', 401);
            }

            $user = auth()->user();
            
            // Check if user is active
            if (!$user->is_active) {
                return $this->errorResponse('Akun Anda telah dinonaktifkan', 403);
            }

            // Update login info
            $user->update([
                'last_login' => now(),
                'login_count' => $user->login_count + 1
            ]);

            return $this->successResponse([
                'user' => $user,
                'token' => $token,
                'token_type' => 'bearer',
                'expires_in' => config('jwt.ttl') * 60
            ], 'Login berhasil');

        } catch (JWTException $e) {
            return $this->errorResponse('Tidak dapat membuat token', 500);
        }
    }

    /**
     * Get authenticated user
     */
    public function me()
    {
        try {
            if (!$user = JWTAuth::parseToken()->authenticate()) {
                return $this->errorResponse('User tidak ditemukan', 404);
            }

            return $this->successResponse($user);
        } catch (\Exception $e) {
            return $this->errorResponse('Token tidak valid', 401);
        }
    }

    /**
     * Logout user
     */
    public function logout()
    {
        try {
            JWTAuth::invalidate(JWTAuth::getToken());
            return $this->successResponse(null, 'Logout berhasil');
        } catch (JWTException $e) {
            return $this->errorResponse('Gagal logout', 500);
        }
    }

    /**
     * Refresh token
     */
    public function refresh()
    {
        try {
            $token = JWTAuth::refresh(JWTAuth::getToken());
            return $this->successResponse([
                'token' => $token,
                'token_type' => 'bearer',
                'expires_in' => config('jwt.ttl') * 60
            ], 'Token berhasil diperbarui');
        } catch (JWTException $e) {
            return $this->errorResponse('Tidak dapat memperbarui token', 401);
        }
    }

    /**
     * Verify email
     */
    public function verifyEmail(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'token' => 'required|string'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator);
        }

        $user = User::where('verification_token', $request->token)->first();

        if (!$user) {
            return $this->errorResponse('Token verifikasi tidak valid', 400);
        }

        $user->update([
            'is_verified' => true,
            'email_verified_at' => now(),
            'verification_token' => null
        ]);

        return $this->successResponse(null, 'Email berhasil diverifikasi');
    }

    /**
     * Forgot password
     */
    public function forgotPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|exists:users,email'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator);
        }

        $user = User::where('email', $request->email)->first();
        $token = Str::random(60);

        $user->update([
            'reset_password_token' => Hash::make($token),
            'reset_password_expires' => now()->addHours(1)
        ]);

        // Send reset password email (implement later)
        // Mail::to($user->email)->send(new ResetPasswordEmail($user, $token));

        return $this->successResponse(null, 'Link reset password telah dikirim ke email Anda');
    }

    /**
     * Reset password
     */
    public function resetPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'token' => 'required|string',
            'email' => 'required|email|exists:users,email',
            'password' => 'required|string|min:6|confirmed'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator);
        }

        $user = User::where('email', $request->email)
                   ->where('reset_password_expires', '>', now())
                   ->first();

        if (!$user || !Hash::check($request->token, $user->reset_password_token)) {
            return $this->errorResponse('Token reset password tidak valid atau sudah expired', 400);
        }

        $user->update([
            'password' => Hash::make($request->password),
            'reset_password_token' => null,
            'reset_password_expires' => null
        ]);

        return $this->successResponse(null, 'Password berhasil direset');
    }
}