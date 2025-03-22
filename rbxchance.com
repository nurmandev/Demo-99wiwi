server {
        listen 80;
        listen [::]:80;
        server_name rbxchance.com;
        root /apps/rbxchance-com/build;

	# auth_basic "Closed Beta!";
	# auth_basic_user_file /apps/beta-pw/.htpasswd;

        location / {
                try_files $uri /index.html;
        }
}
