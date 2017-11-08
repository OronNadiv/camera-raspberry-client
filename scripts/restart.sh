echo "\n\nRestart called. $(date)"

FILES=/var/tmp/*.exit
FOUND=false

if [ -n "$(ls -A /var/tmp/*.exit)" ]
then
 echo "found files."

 for file in $FILES
 do
  echo "Current file is *$file*"
  echo "before moving $file"
  mv "$file" "${file%}.old";
  echo "after moving"
 done
 echo "***** Restarting"
 sudo reboot
 echo "after reboot"
else
 echo "***** Not restarting..."
fi
