/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Implementation of two javascript functions that can be used to resolve or reject a js promise.
 */
package com.facebook.react.bridge;

import javax.annotation.Nullable;

import expo.errors.HostApplicationCausedPlatformException;

public class PromiseImpl implements Promise {

  private static final String DEFAULT_ERROR = "ERR_UNSPECIFIED";

  private @Nullable Callback mResolve;
  private @Nullable Callback mReject;

  public PromiseImpl(@Nullable Callback resolve, @Nullable Callback reject) {
    mResolve = resolve;
    mReject = reject;
  }

  @Override
  public void resolve(Object value) {
    if (mResolve != null) {
      mResolve.invoke(value);
    }
  }

  @Override
  public void reject(String code, String message) {
    reject(code, message, /*Throwable*/null);
  }

  @Override
  @Deprecated
  public void reject(String message) {
    reject(DEFAULT_ERROR, message, /*Throwable*/null);
  }

  @Override
  public void reject(String code, Throwable e) {
    reject(code, e.getMessage(), e);
  }

  @Override
  public void reject(Throwable e) {
    String errorCode = DEFAULT_ERROR;
    if (e instanceof HostApplicationCausedPlatformException) {
      errorCode = ((HostApplicationCausedPlatformException) e).getCode();
    }
    reject(errorCode, e.getMessage(), e);
  }

  @Override
  public void reject(String code, String message, @Nullable Throwable e) {
    if (mReject != null) {
      if (code == null) {
        code = DEFAULT_ERROR;
      }
      // The JavaScript side expects a map with at least the error message.
      // It is possible to expose all kind of information. It will be available on the JS
      // error instance.
      WritableNativeMap errorInfo = new WritableNativeMap();
      errorInfo.putString("code", code);
      errorInfo.putString("message", message);
      if (e != null) {
        errorInfo.putMap("platformError", serializeThrowable(e));
      }
      mReject.invoke(errorInfo);
    }
  }

  private WritableMap serializeThrowable(Throwable e) {
    WritableNativeMap errorInfo = new WritableNativeMap();
    errorInfo.putString("className", e.getClass().getCanonicalName());
    errorInfo.putString("message", e.getLocalizedMessage());

    StackTraceElement[] stackTrace = e.getStackTrace();
    if (stackTrace != null) {
      WritableArray stackTraceArray = Arguments.createArray();
      for (StackTraceElement element : stackTrace) {
        stackTraceArray.pushString(element.toString());
      }
      errorInfo.putArray("stack", stackTraceArray);
    }

    Throwable cause = e.getCause();
    if (cause != null) {
      errorInfo.putMap("cause", serializeThrowable(cause));
    }

    return errorInfo;
  }
}
