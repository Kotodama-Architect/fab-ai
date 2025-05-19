const mongoose = require('mongoose');
const viewerSchema = require('./schema/viewerSchema');

// Password hashing and comparison logic will be handled in auth routes or a shared utility.
// For example, using bcrypt:
// viewerSchema.pre('save', async function (next) {
//   if (!this.isModified('password')) {
//     return next();
//   }
//   this.password = await bcrypt.hash(this.password, 10);
//   next();
// });

// viewerSchema.methods.comparePassword = function (candidatePassword) {
//   return bcrypt.compare(candidatePassword, this.password);
// };

const Viewer = mongoose.model('Viewer', viewerSchema);

module.exports = Viewer; 