// class ApiError extends Error {
//     constructor(
//         statusCode,
//         message= "Smoting went Wrong",
//         errors = [],
//         stack = ""
//     ){

//         super(message)
//         this.statusCode = statusCode
//         this.data = null
//         this.message = message
//         this.success = false
//         this.errors = errors

//         if(stack) {
//             this.stack = stack
//         }else{
//            Error.captureStackTrace(this. this.constructor)
//         }
//     }
// }


// export {ApiError}

class ApiError extends Error {
  constructor(
    statusCode,
    message = "Something went wrong", // Fixed typo: "Smoting" -> "Something"
    errors = [],
    stack = ""
  ) {
    super(message); // Pass the message to the parent `Error` class
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor); // Fixed incorrect syntax
    }
  }
}

export { ApiError };
