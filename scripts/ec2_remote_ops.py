import boto3
import time
import sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

session = boto3.Session(profile_name='roofshift-ai', region_name='ap-southeast-2')
ssm = session.client('ssm')
instance_id = 'i-0803fc68806367b46'

def run_remote_commands(commands, timeout_sec=120):
    print(f"Executing {len(commands)} commands on {instance_id}...")
    res = ssm.send_command(
        InstanceIds=[instance_id],
        DocumentName='AWS-RunShellScript',
        Parameters={'commands': commands}
    )
    cmd_id = res['Command']['CommandId']
    start_time = time.time()
    
    while time.time() - start_time < timeout_sec:
        time.sleep(2)
        inv = ssm.get_command_invocation(CommandId=cmd_id, InstanceId=instance_id)
        status = inv['Status']
        if status in ['Success', 'Failed', 'TimedOut', 'Cancelled']:
            print(f"Execution finished with status: {status}")
            stdout = inv.get('StandardOutputContent', '')
            stderr = inv.get('StandardErrorContent', '')
            if stdout:
                print("--- STDOUT ---")
                print(stdout)
            if stderr:
                print("--- STDERR ---")
                print(stderr)
            return status == 'Success', stdout, stderr
    print("Command timed out waiting for invocation.")
    return False, "", "Timeout"

if __name__ == '__main__':
    timeout = 300
    cmds = []
    i = 1
    while i < len(sys.argv):
        if sys.argv[i] == '--timeout' and i + 1 < len(sys.argv):
            timeout = int(sys.argv[i+1])
            i += 2
        else:
            cmds.append(sys.argv[i])
            i += 1
    if not cmds:
        cmds = ['uptime']
    success, out, err = run_remote_commands(cmds, timeout_sec=timeout)
    if not success:
        sys.exit(1)

