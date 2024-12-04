import { auth, db } from './firebase-config.js';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, updateDoc, getDocs, runTransaction, addDoc, serverTimestamp, deleteField,deleteDoc  } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

// ------------------------------------------------ Profile dropdown Start ------------------------------------------------------ //
    
        // Profile dropdown toggle
        document.getElementById("profileImage").addEventListener("click", function() {
            const options = document.getElementById("profileOptions");
            options.style.display = (options.style.display === "none" || options.style.display === "") ? "block" : "none";
        });
    
        document.addEventListener("click", function(event) {
            const options = document.getElementById("profileOptions");
            const profileImage = document.getElementById("profileImage");
            if (event.target !== options && event.target !== profileImage) {
                options.style.display = "none";
            }
        });
    
        onAuthStateChanged(auth, async (user) => { 
            if (user) {
                // Fetch user data from Firestore
                const userDocRef = doc(db, "users", user.uid);
                const userDoc = await getDoc(userDocRef);
    
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const profilePicUrl = userData.profilePicUrl || './images/social logo.png';
    
                    // Update profile information in the navbar
                    document.getElementById('profile-name').textContent = userData.fullname;
                    document.getElementById('profile-handle').textContent = `@${userData.username}`;
                    document.getElementById('profileImage').src = profilePicUrl;
                    document.getElementById('profileDropdownImage').src = profilePicUrl;
    
                    // Update profile information in the sidebar
                    document.getElementById('sidebarProfileName').textContent = userData.fullname;
                    document.getElementById('sidebarProfileHandle').textContent = `@${userData.username}`;
                    document.getElementById('sidebarProfileImage').src = profilePicUrl;
    
                    // Load user's posts and pass the profile picture URL
                    loadPosts(user.uid, profilePicUrl);
                } else {
                    console.error("No such user document!");
                }
            } else {
                document.getElementById('profileOptions').style.display = 'none';
            }
        });
        
        // Function to update profile options based on login status
function updateProfileOptions() {
    const user = auth.currentUser; // Get the current logged-in user
    const myProfileOption = document.getElementById('myProfileOption');
    const loginOption = document.getElementById('loginOption');
    const signupOption = document.getElementById('signupOption');
    const logoutOption = document.getElementById('logoutOption');

    if (user) {
        // User is logged in
        myProfileOption.style.display = 'block';
        loginOption.style.display = 'none';
        signupOption.style.display = 'none';
        logoutOption.style.display = 'block';
    } else {
        // User is not logged in
        myProfileOption.style.display = 'none';
        loginOption.style.display = 'block';
        signupOption.style.display = 'block';
        logoutOption.style.display = 'none';
    }
}

// Function to handle logout
async function handleLogout() {
    try {
        await auth.signOut(); // Sign out the user
        alert('You have successfully logged out.'); // Provide feedback
        window.location.href = 'login.html'; 
    } catch (error) {
        alert('Error signing out. Please try again.'); // Notify user on error
        console.error('Error signing out:', error);
    }
}

// Attach event listener to logout option
const logoutOption = document.getElementById('logoutOption');
if (logoutOption) {
    logoutOption.addEventListener('click', handleLogout);
}

// Update profile options on page load and auth state change
auth.onAuthStateChanged(updateProfileOptions);
updateProfileOptions(); // Ensure it's also run on page load

// ------------------------------------------------ Profile dropdown end ------------------------------------------------------ //

// ------------------------------------------------ Posts Loading Start ------------------------------------------------------ //

    
// Cache for profile pictures to minimize repeated database calls
const profilePicCache = {};

// Function to load posts for a given user
function loadPosts(userId) {
    const feedsContainer = document.querySelector('.feeds');
    feedsContainer.innerHTML = '<p>Loading posts...</p>'; // Show loading message

    const userRef = doc(db, 'users', userId);

    getDoc(userRef)
        .then((userSnapshot) => {
            if (!userSnapshot.exists()) {
                feedsContainer.innerHTML = '<p>User not found.</p>';
                return;
            }

            const followedUsers = userSnapshot.data().following || [];  // Assuming `following` is an array of followed user IDs

            // Include the current user's ID in the list
            followedUsers.push(userId);

            const postPromises = followedUsers.map((followedUserId) => {
                const userPostsRef = collection(db, 'users', followedUserId, 'posts');
                const q = query(userPostsRef, orderBy('timestamp', 'desc'));

                return getDocs(q)  // Fetch the posts
                    .catch(error => {
                        console.error(`Error fetching posts for user ${followedUserId}:`, error);
                        return []; // Return empty array on error
                    });
            });

            Promise.all(postPromises).then((snapshots) => {
                feedsContainer.innerHTML = ''; // Clear loading message

                // Combine all posts
                const allPosts = [];
                snapshots.forEach((snapshot) => {
                    snapshot.forEach((doc) => {
                        allPosts.push(doc);
                    });
                });

                // Sort posts by timestamp in descending order
                allPosts.sort((a, b) => b.data().timestamp.seconds - a.data().timestamp.seconds);

                // Render all posts
                allPosts.forEach((doc) => {
                    const ownerId = doc.data().ownerId; // Get the owner ID of the post
                    getOwnerProfilePic(ownerId).then(profilePicUrl => {
                        renderPost(doc, profilePicUrl);
                    });
                });
            });
        })
        .catch(error => {
            console.error("Error fetching user document: ", error);
            feedsContainer.innerHTML = '<p>Error loading posts.</p>';
        });
}

// Function to get the owner's profile picture
function getOwnerProfilePic(ownerId) {
    if (profilePicCache[ownerId]) {
        return Promise.resolve(profilePicCache[ownerId]); // Return cached value if available
    }

    const userRef = doc(db, 'users', ownerId);

    return getDoc(userRef).then((userDoc) => {
        if (userDoc.exists()) {
            const profilePicUrl = userDoc.data().profilePicUrl || './images/social logo.png';  // Return profile picture URL or default
            profilePicCache[ownerId] = profilePicUrl; // Cache the profile picture URL
            return profilePicUrl;
        } else {
            console.error("User document does not exist!");
            return './images/social logo.png'; // Return default image if user doesn't exist
        }
    }).catch((error) => {
        console.error("Error fetching user profile picture: ", error);
        return './images/social logo.png'; // Return default image in case of an error
    });
}

// Function to update post usernames
function updatePostUsernames(ownerId, newUsername) {
    const feedsContainer = document.querySelector('.feeds');
    const posts = feedsContainer.querySelectorAll('.feed[data-owner-id="' + ownerId + '"]');

    posts.forEach(post => {
        const usernameLink = post.querySelector('.info a');
        if (usernameLink) {
            usernameLink.textContent = `${newUsername || "User"}`;
        }
    });
}

// Function to listen for user updates
function listenForUserUpdates(ownerId) {
    const userRef = doc(db, 'users', ownerId);
    const unsubscribe = onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
            const userData = doc.data();
            // Update the usernames of posts for this user
            updatePostUsernames(ownerId, userData.username);
        }
    }, (error) => {
        console.error("Error listening for user updates:", error);
    });

    return unsubscribe; // Return the unsubscribe function for cleanup if needed
}

// Example usage
const userId = 'someUserId'; // Replace with actual user ID
loadPosts(userId);
const unsubscribe = listenForUserUpdates(userId);

// Remember to call unsubscribe when the component unmounts or no longer needs to listen


// ------------------------------------------------ Posts Loading End ------------------------------------------------------ //

function renderPost(doc, profilePicUrl) {
    const feedsContainer = document.querySelector('.feeds');
    if (feedsContainer) {
        const caption = doc.data().caption || 'No caption provided';
        const hashtags = doc.data().hashtags || 'yourHashtag';
        const likes = doc.data().likes || 0;

        const post = `
            <div class="feed" data-id="${doc.id}" data-owner-id="${doc.data().ownerId}">
                <div class="head">
                    <div class="user">
                        <div class="profile-photo">
                            <img src="${profilePicUrl}" alt="${doc.data().username}'s profile picture">
                        </div>
                        <div class="info">
                            <a href="/social-media-website-main/social-media-website-main/profile.html?uid=${doc.data().ownerId}">${doc.data().username || "User"}</a>
                        </div>
                    </div>
                    <span class="edit">
                        <i class="uil uil-ellipsis-h"></i>
                        <button class="delete-button" style="display: none;">Delete</button>
                    </span>
                </div>
                <div class="caption-container">
                    <div class="caption">
                        <p>${caption}</p>
                    </div>
                </div>
                <div class="caption">
                    <p><b><span class="hashtag">${hashtags}</span></b></p>
                </div>
                <div class="action-buttons">
                    <div class="interaction-buttons">
                        <span class="like-button" data-id="${doc.id}">
                            <i class="uil uil-heart"></i>
                        <span class="like-count">${likes}</span>
                        </span>

                        <span class="comment-icon">
                            <i class="uil uil-comment-dots"></i>
                        </span>
                    </div>
                    <div class="bookmark">
                        <span><i class="uil uil-bookmark-full"></i></span>
                    </div>
                </div>
                <small>${new Date(doc.data().timestamp?.seconds * 1000).toLocaleTimeString()}</small>
            </div>
        `;

        feedsContainer.insertAdjacentHTML('afterbegin', post);

        // Show the delete button when ellipsis is clicked
        const postElement = feedsContainer.querySelector(`[data-id="${doc.id}"]`);
        const editIcon = postElement.querySelector('.edit i');
        const deleteButton = postElement.querySelector('.delete-button');

        editIcon.addEventListener('click', () => {
            deleteButton.style.display = deleteButton.style.display === 'none' ? 'block' : 'none';
        });

        deleteButton.addEventListener('click', () => deletePost(doc.id, doc.data().ownerId));

        // Add event listener for comment icon to toggle popup
        const commentIcon = postElement.querySelector('.comment-icon');
        commentIcon.addEventListener('click', () => {
            const postId = doc.id;
            const ownerId = doc.data().ownerId;
            toggleCommentsPopup(postId, ownerId); // Call your popup function
        });

        // Add event listener for like button
        const likeButton = postElement.querySelector('.like-button');
        likeButton.addEventListener('click', async () => {
            const postId = doc.id;
            const ownerId = doc.data().ownerId;
            await handleLike(postId, ownerId); // Call the handleLike function
        });
    }
}

// ------------------------------------------------ Posts End ------------------------------------------------------ //

function deletePost(postId, ownerId) {
    const postRef = doc(db, 'users', ownerId, 'posts', postId);

    // Delete post from Firestore
    deleteDoc(postRef)
        .then(() => {
            console.log('Post deleted successfully');
            // Remove the post element from the DOM
            const postElement = document.querySelector(`.feed[data-id="${postId}"]`);
            if (postElement) postElement.remove();
        })
        .catch((error) => {
            console.error('Error deleting post:', error);
            alert('Failed to delete post. Please try again.');
        });
}


async function handleLike(postId, ownerId) {
    const likeButton = document.querySelector(`[data-id="${postId}"] .like-button`); // Get the like button by postId
    const likeCountElement = likeButton.querySelector('.like-count');
    const userId = auth.currentUser.uid; // Get the current user's ID
    
    // Reference to the post document in Firestore
    const postRef = doc(db, 'users', ownerId, 'posts', postId);
    const postDoc = await getDoc(postRef);

    if (!postDoc.exists()) {
        console.error('Post not found');
        return;
    }

    const postData = postDoc.data();
    const currentLikes = postData.likes || 0;
    const likedUsers = postData.likedUsers || {};

    // Check if the user has already liked the post
    const isLiked = likedUsers[userId] !== undefined;

    if (isLiked) {
        // If the user already liked the post, unlike it
        likeCountElement.textContent = currentLikes - 1;
        likeButton.classList.remove('liked'); // Update button appearance
        await updateLikeCountInDatabase(postId, ownerId, currentLikes - 1, false);
    } else {
        // If the user has not liked the post, like it
        likeCountElement.textContent = currentLikes + 1;
        likeButton.classList.add('liked'); // Update button appearance
        await updateLikeCountInDatabase(postId, ownerId, currentLikes + 1, true);
    }
}

async function checkUserLikeStatus(postId, ownerId) {
    const likeButton = document.querySelector(`[data-id="${postId}"] .like-button`); // Get the like button by postId
    const likeCountElement = likeButton.querySelector('.like-count');
    const userId = auth.currentUser.uid; // Get the current user's ID
    
    const postRef = doc(db, 'users', ownerId, 'posts', postId);
    const postDoc = await getDoc(postRef);

    if (!postDoc.exists()) {
        console.error('Post not found');
        return;
    }

    const postData = postDoc.data();
    const currentLikes = postData.likes || 0;
    const likedUsers = postData.likedUsers || {};

    // Check if the user has liked the post
    const isLiked = likedUsers[userId] !== undefined;

    if (isLiked) {
        // If the user has liked the post, mark the button as liked
        likeButton.classList.add('liked');
    } else {
        // If the user has not liked the post, mark the button as not liked
        likeButton.classList.remove('liked');
    }

    // Update the like count
    likeCountElement.textContent = currentLikes;
}

async function updateLikeCountInDatabase(postId, ownerId, newLikeCount, isLiked) {
    try {
        const postRef = doc(db, 'users', ownerId, 'posts', postId);
        const userId = auth.currentUser.uid; // Get the current user's ID
        const timestamp = new Date();

        // Update the like count and liked status for the user
        await updateDoc(postRef, {
            likes: newLikeCount, // Update like count
            [`likedUsers.${userId}`]: isLiked ? timestamp : deleteField(), // Track if the user liked the post
        });

        console.log(`${isLiked ? 'Liked' : 'Unliked'} post ${postId} by user ${userId}`);
    } catch (error) {
        console.error('Error updating likes:', error);
    }
}

// When the page loads or refreshes, check the like status for each post
document.querySelectorAll('.like-button').forEach(button => {
    const postId = button.dataset.id;  // Get the postId from the data-id attribute
    const ownerId = button.dataset.ownerId;  // Get the ownerId for the post
    checkUserLikeStatus(postId, ownerId);
});


// ------------------------------------------------ Posts Commenting Start ------------------------------------------------------ //

// Function to load comments
// Function to load comments
async function loadComments(postId, ownerId) {
    const commentsContainer = document.getElementById('commentsContainer');
    if (!commentsContainer) {
        console.error('Comments container element not found.');
        return;
    }

    try {
        const commentsQuery = query(
            collection(db, 'users', ownerId, 'posts', postId, 'comments'),
            orderBy('timestamp', 'asc')
        );
        const querySnapshot = await getDocs(commentsQuery);

        commentsContainer.innerHTML = ''; // Clear existing comments

        querySnapshot.forEach(doc => {
            const comment = doc.data();
            const commentId = doc.id;
            const commentElement = document.createElement('div');
            commentElement.classList.add('comment-item');
            const username = comment.username || "User"; // Fallback if no username

            commentElement.innerHTML = `
                <p><b>${username}:</b> ${comment.comment}</p>
                <button class="delete-comment-btn" data-comment-id="${commentId}" data-post-id="${postId}" data-owner-id="${ownerId}">Delete</button>
            `;
            commentsContainer.appendChild(commentElement);
        });

        // Add event listener for delete buttons
        document.querySelectorAll('.delete-comment-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const commentId = e.target.dataset.commentId;
                const postId = e.target.dataset.postId;
                const ownerId = e.target.dataset.ownerId;
                await deleteComment(postId, ownerId, commentId);
            });
        });
    } catch (error) {
        console.error('Error loading comments: ', error);
    }
}

// Function to delete a comment
async function deleteComment(postId, ownerId, commentId) {
    try {
        const commentRef = doc(db, 'users', ownerId, 'posts', postId, 'comments', commentId);
        await deleteDoc(commentRef);
        console.log('Comment deleted successfully');
        
        // Reload comments after deletion
        loadComments(postId, ownerId);
    } catch (error) {
        console.error('Error deleting comment:', error);
    }
}


// Function to toggle popup visibility and load comments
function toggleCommentsPopup(postId, ownerId) {
    const commentsPopup = document.getElementById('commentsPopup');
    const commentsContainer = document.getElementById('commentsContainer');

    if (!commentsPopup || !commentsContainer) {
        console.error('Comments popup or container element not found.');
        return;
    }

    // Clear previous comments and reset the comment input
    commentsContainer.innerHTML = ''; 
    document.getElementById('commentInput').value = ""; // Clear input field

    // Load comments for the post
    loadComments(postId, ownerId)
        .then(() => {
            commentsPopup.classList.toggle('hidden'); // Toggle visibility
        })
        .catch((error) => {
            console.error('Error loading comments:', error);
        });

    // Set postId and ownerId for send button
    const sendCommentBtn = document.getElementById('sendCommentBtn');
    if (sendCommentBtn) {
        sendCommentBtn.dataset.postId = postId;
        sendCommentBtn.dataset.ownerId = ownerId;
    } else {
        console.error('Send comment button not found.');
    }
}

// Add event listeners for comment buttons to open comments popup
document.querySelectorAll('.comment-button').forEach(button => {
    button.addEventListener('click', () => {
        const postId = button.dataset.postId;
        const ownerId = button.dataset.ownerId;
        toggleCommentsPopup(postId, ownerId);
    });
});

// Close comments popup when clicking on close button
document.getElementById('closeCommentsBtn')?.addEventListener('click', () => {
    const commentsPopup = document.getElementById('commentsPopup');
    if (commentsPopup) {
        commentsPopup.classList.add('hidden'); // Hide the popup
    }
});

// Send comment button event listener
document.getElementById('sendCommentBtn')?.addEventListener('click', () => {
    const sendCommentBtn = document.getElementById('sendCommentBtn');
    const postId = sendCommentBtn.dataset.postId;
    const ownerId = sendCommentBtn.dataset.ownerId;
    const commentInput = document.getElementById('commentInput').value;

    if (postId && ownerId) {
        handleComment(postId, ownerId, commentInput); // Send comment
    } else {
        console.error('Post ID or Owner ID is missing.');
    }
});

async function handleComment(postId, ownerId, comment) {
    if (comment.trim() === "") return;

    try {
        const currentUser = auth.currentUser;

        // Check if the user is logged in
        if (!currentUser) {
            console.error('No user is logged in');
            return;
        }

        const userId = currentUser.uid; // Get the UID of the logged-in user

        // Fetch the user document from Firestore using the UID
        const userDoc = await getDoc(doc(db, 'users', userId));

        // Retrieve the username, or use a fallback
        const username = userDoc.exists() && userDoc.data().username ? userDoc.data().username : "User";

        const commentsRef = collection(db, 'users', ownerId, 'posts', postId, 'comments');

        // Add the comment to the comments collection
        await addDoc(commentsRef, {
            username: username, // Use the retrieved username
            comment: comment,
            timestamp: serverTimestamp()
        });

        // Reload comments after adding new one
        await loadComments(postId, ownerId);

        // Clear the comment input
        const commentInput = document.getElementById('commentInput');
        if (commentInput) {
            commentInput.value = "";
        }
    } catch (error) {
        console.error('Error adding comment:', error);
    }
}

// Make sure to reset the state when opening the comment popup
document.querySelectorAll('.comment-button').forEach(button => {
    button.addEventListener('click', (event) => {
        const postId = event.currentTarget.dataset.postId; // Adjust as necessary
        const ownerId = event.currentTarget.dataset.ownerId; // Adjust as necessary

        // Reset comment input and other states
        resetCommentState();

        toggleCommentsPopup(postId, ownerId); // Open comments popup
    });
});

// Function to reset comment input and any other necessary state
function resetCommentState() {
    const commentInput = document.getElementById('commentInput'); // Ensure this ID matches your input element
    if (commentInput) {
        commentInput.value = ""; // Clear the comment input
    }

    // If you have any other UI elements (like an error message or previous comments), reset them here
    const errorMessage = document.getElementById('errorMessage'); // Example for an error message
    if (errorMessage) {
        errorMessage.textContent = ""; // Clear previous error messages
    }

    // Reset any comments display if necessary
    // For example: clear the comments list before loading new ones
    const commentsList = document.getElementById('commentsList'); // Example for comments display
    if (commentsList) {
        commentsList.innerHTML = ""; // Clear previous comments
    }
}

// ------------------------------------------------ Posts Commenting End ------------------------------------------------------ //

// ------------------------------------------------ Search Model Start ------------------------------------------------------ //

// Modal management for searching
document.getElementById('exploreMenuItem').addEventListener('click', () => {
    document.getElementById('searchModal').style.display = 'block';
});

// Close modals
document.querySelector('.close-btn').addEventListener('click', () => {
    document.getElementById('searchModal').style.display = 'none';
});

       
document.getElementById('searchButton').addEventListener('click', async function() {
    const username = document.getElementById('searchInput').value.trim();
        
            if (username) {
                try {
                    const usersRef = collection(db, 'users');
                    const q = query(usersRef, where('username', '==', username));
                    const querySnapshot = await getDocs(q);
        
                    if (!querySnapshot.empty) {
                        // Get the userId of the searched user
                        const userId = querySnapshot.docs[0].id;
                        
                        // Redirect to the profile page of the searched user using the correct variable
                        window.location.href = `profile.html?uid=${userId}`;
        
                    } 
                    
                    else {
                        alert('User not found');
                    }
                } 
                catch (error) {
                    console.error('Error searching for user:', error);
                }
            } else {
                alert('Please enter a username.');
        }
});
        
        document.getElementById('searchInput').addEventListener('input', async function() {
            const queryText = this.value.trim();
            const suggestionsContainer = document.getElementById('suggestionsContainer');
            
            if (queryText.length > 0) {
                try {
                    const usersRef = collection(db, 'users');
                    const q = query(usersRef, where('username', '>=', queryText), where('username', '<=', queryText + '\uf8ff'));
                    const querySnapshot = await getDocs(q);
        
                    suggestionsContainer.innerHTML = ''; // Clear previous suggestions
        
                    if (!querySnapshot.empty) {
                        querySnapshot.forEach(doc => {
                            const username = doc.data().username;
                            const userId = doc.id;
                            const suggestionItem = document.createElement('div');
                            suggestionItem.className = 'suggestion-item';
                            suggestionItem.textContent = username;
                            suggestionItem.addEventListener('click', () => {
                                window.location.href = `profile.html?uid=${userId}`;
                            });
                            suggestionsContainer.appendChild(suggestionItem);
                        });
                    } else {
                        suggestionsContainer.innerHTML = '<p>No users found</p>';
                    }
                } catch (error) {
                    console.error('Error fetching user suggestions:', error);
                }
            } else {
                suggestionsContainer.innerHTML = ''; // Clear suggestions if input is empty
            }
        });

// ------------------------------------------------ Search Model End ------------------------------------------------------ //

// ------------------------------------------------ Notifications Start ------------------------------------------------------

document.addEventListener('DOMContentLoaded', function () {
    const notificationIcon = document.getElementById('notifications');
    const notificationsPopup = document.querySelector('.notifications-popup');
    const notificationCount = document.querySelector('.notification-count'); // Element to display the count

    notificationIcon.addEventListener('click', function () {
        const isVisible = notificationsPopup.style.display === 'block';
        if (isVisible) {
            // Hide notifications popup and clear content
            notificationsPopup.style.display = 'none';
            notificationsPopup.innerHTML = ''; // Clear the notifications content
            resetNotificationCount(); // Reset the count to 0
        } else {
            // Show notifications popup
            notificationsPopup.style.display = 'block';
            // Fetch and display new notifications
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    const userId = user.uid;
                    fetchNotifications(userId); // Fetch and display new notifications
                }
            });
        }
    });

    document.addEventListener('click', function (event) {
        if (!notificationIcon.contains(event.target) && !notificationsPopup.contains(event.target)) {
            notificationsPopup.style.display = 'none';
            notificationsPopup.innerHTML = ''; // Clear the notifications content
            resetNotificationCount(); // Reset the count to 0
        }
    });

    async function fetchNotifications(userId) {
        const userRef = doc(db, 'users', userId);
    
        try {
            const userDoc = await getDoc(userRef);
            const userData = userDoc.data();
    
            if (userData) {
                let count = 0; // Notification count
    
                // Process followers
                if (userData.followers) {
                    for (const followerId of userData.followers) {
                        const followerRef = doc(db, 'users', followerId);
                        const followerDoc = await getDoc(followerRef);
                        const followerData = followerDoc.data();
                        addNotification(followerData.fullname, 'started following you', followerData.profilePicUrl, new Date().toISOString());
                        count++;
                    }
                }
    
                // Process likes and comments
                const postsRef = collection(db, 'users', userId, 'posts');
                const postsQuery = query(postsRef);
                const postsSnapshot = await getDocs(postsQuery);
    
                for (const postDoc of postsSnapshot.docs) {
                    const postData = postDoc.data();
                    const postId = postDoc.id;
    
                    // Process likes (Handle as a map/object)
                    if (postData.likedUsers && typeof postData.likedUsers === 'object') {
                        for (const likeId in postData.likedUsers) {
                            if (postData.likedUsers.hasOwnProperty(likeId)) {
                                const likerRef = doc(db, 'users', likeId);
                                const likerDoc = await getDoc(likerRef);
                                const likerData = likerDoc.data();
                                addNotification(likerData.fullname, 'liked your post', likerData.profilePicUrl, postData.likedUsers[likeId], postId);
                                count++;
                            }
                        }
                    }
    
                    // Process comments (Handle as an array)
                    if (Array.isArray(postData.comments)) {
                        for (const comment of postData.comments) {
                            const commenterRef = doc(db, 'users', comment.userId);
                            const commenterDoc = await getDoc(commenterRef);
                            const commenterData = commenterDoc.data();
                            addNotification(commenterData.fullname, 'commented on your post', commenterData.profilePicUrl, comment.timestamp || new Date().toISOString(), postId);
                            count++;
                        }
                    }
                }
    
                // Update notification count
                updateNotificationCount(count);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    }
    
    function addNotification(userName, action, profilePicUrl, timestamp, postId) {
        const notificationElement = document.createElement('div');
        notificationElement.className = 'notification-item'; // Added class for styling
        let timeAgo = '';
        
        // Check if it's a following notification, and skip timestamp if it's a follow action
        if (action === 'started following you') {
            timeAgo = ''; // No timestamp for follow notifications
        } else {
            timeAgo = formatTime(timestamp); // Format the timestamp for other actions
        }
    
        notificationElement.innerHTML = `
            <div class="profile-photo">
                <img src="${profilePicUrl || './images/social logo.png'}" alt="Profile Picture">
            </div>
            <div class="notification-body">
                <b>${userName}</b> ${action}
                ${timeAgo ? `<small class="text-muted">${timeAgo}</small>` : ''}
            </div>
        `;
        notificationsPopup.prepend(notificationElement);
    }
    

    function formatTime(timestamp) {
        let date;
    
        // Check if the timestamp is a Firestore Timestamp object
        if (timestamp instanceof Date) {
            date = timestamp;  // Already a JavaScript Date object
        } else if (timestamp && timestamp.seconds && timestamp.nanoseconds) {
            // Firestore Timestamp: Convert it to JavaScript Date
            date = new Date(timestamp.seconds * 1000);
        } else {
            // It's a string or a regular Date: directly parse it
            date = new Date(timestamp);
        }
    
        if (isNaN(date)) {
            return 'Invalid Date';  // Fallback in case of an invalid timestamp
        }
    
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' on ' + date.toLocaleDateString();
    }
    

    function updateNotificationCount(count) {
        if (count > 0) {
            notificationCount.textContent = count;
            notificationCount.style.display = 'inline'; // Show the count
        } else {
            notificationCount.style.display = 'none'; // Hide if no notifications
        }
    }

    function resetNotificationCount() {
        notificationCount.textContent = '0';
    }
});

// ------------------------------------------------ Notifications End ------------------------------------------------------
