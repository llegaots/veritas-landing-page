// Clear localStorage archived sequences to fix the filtering issue
if (typeof window !== 'undefined') {
  localStorage.removeItem('archivedSequences');
  console.log('✅ Cleared archivedSequences from localStorage');
} else {
  console.log('Run this in browser console: localStorage.removeItem("archivedSequences")');
}
