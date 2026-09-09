;;;; Verify call-next-method argument propagation semantics in CLOS
;;;;
;;;; Question: when an :around method calls (call-next-method new-arg),
;;;; does new-arg reach the primary method?
;;;;
;;;; Usage: sbcl --script bench/verify-cnm-semantics.lisp

(defclass animal () ())
(defclass dog (animal) ())

;;; Test 1: Around method passes new args via call-next-method
;;; Do the new args reach the primary?

(defgeneric test-around-cnm (x)
  (:documentation "Test whether around CNM args propagate to primary"))

(defmethod test-around-cnm ((x dog))
  (format nil "primary saw: ~A (type ~A)" x (type-of x)))

(defmethod test-around-cnm :around ((x dog))
  (format t "~%Test 1: around calling (call-next-method (make-instance 'animal))~%")
  (format t "  around received: ~A (type ~A)~%" x (type-of x))
  (let ((result (call-next-method (make-instance 'animal))))
    (format t "  result: ~A~%" result)
    result))

(format t "=== Test 1: Around method CNM with different arg ===")
(handler-case
    (test-around-cnm (make-instance 'dog))
  (error (e)
    (format t "  ERROR: ~A~%" e)))

;;; Test 2: Multiple arounds — do args propagate through the chain?

(defclass labrador (dog) ())

(defgeneric test-multi-around (x)
  (:documentation "Test arg propagation through multiple arounds"))

(defmethod test-multi-around ((x animal))
  (format nil "primary saw type: ~A" (type-of x)))

(defmethod test-multi-around :around ((x dog))
  (format t "  outer-around received type: ~A~%" (type-of x))
  (call-next-method))

(defmethod test-multi-around :around ((x labrador))
  (format t "  inner-around received type: ~A, passing animal~%" (type-of x))
  (call-next-method (make-instance 'animal)))

(format t "~%=== Test 2: Multiple arounds, inner passes new arg ===~%")
(handler-case
    (let ((result (test-multi-around (make-instance 'labrador))))
      (format t "  result: ~A~%" result))
  (error (e)
    (format t "  ERROR: ~A~%" e)))

;;; Test 3: Around + before/after — do new args reach before/after methods?

(defgeneric test-around-before-after (x)
  (:documentation "Test CNM arg propagation with before/after methods"))

(defmethod test-around-before-after ((x animal))
  (format t "  primary saw type: ~A~%" (type-of x))
  (type-of x))

(defmethod test-around-before-after :before ((x animal))
  (format t "  before saw type: ~A~%" (type-of x)))

(defmethod test-around-before-after :after ((x animal))
  (format t "  after saw type: ~A~%" (type-of x)))

(defmethod test-around-before-after :around ((x dog))
  (format t "  around received type: ~A, passing animal~%" (type-of x))
  (call-next-method (make-instance 'animal)))

(format t "~%=== Test 3: Around passes new arg — do before/after/primary see it? ===~%")
(handler-case
    (let ((result (test-around-before-after (make-instance 'dog))))
      (format t "  result: ~A~%" result))
  (error (e)
    (format t "  ERROR: ~A~%" e)))

;;; Test 4: Primary CNM with new args

(defgeneric test-primary-cnm (x)
  (:documentation "Test CNM arg propagation in primary methods"))

(defmethod test-primary-cnm ((x animal))
  (format nil "base-primary saw type: ~A" (type-of x)))

(defmethod test-primary-cnm ((x dog))
  (format t "  dog-primary received type: ~A, passing animal~%" (type-of x))
  (let ((result (call-next-method (make-instance 'animal))))
    (format t "  result from base: ~A~%" result)
    result))

(format t "~%=== Test 4: Primary CNM with new args ===~%")
(handler-case
    (let ((result (test-primary-cnm (make-instance 'dog))))
      (format t "  final result: ~A~%" result))
  (error (e)
    (format t "  ERROR: ~A~%" e)))

(format t "~%=== Done ===~%")
